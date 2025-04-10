const Order = require('../models/orders.model');

// Tạo hóa đơn mới
exports.createOrder = async (req, res) => {
    try {
        const {
            invoiceCode,
            createdAt,
            employeeId,
            employeeName,
            items,
            totalAmount,
            paymentMethod,
            customerPaid,
            change
        } = req.body;

        if (!invoiceCode || !createdAt || !employeeId || !employeeName || !items || items.length === 0) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
        }

        const newOrder = new Order({
            invoiceCode,
            createdAt,
            employeeId,
            employeeName,
            items,
            totalAmount,
            paymentMethod,
            customerPaid,
            change
        });

        const savedOrder = await newOrder.save();
        res.status(201).json({ message: 'Tạo hóa đơn thành công.', order: savedOrder });
    } catch (err) {
        console.error('Lỗi khi tạo hóa đơn:', err);
        res.status(500).json({ message: 'Lỗi máy chủ.', error: err.message });
    }
};

exports.getOrder = async (req, res) => {
    try {
        const orders = await Order.find();
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'An error occurred while fetching orders.' });
    }
};

exports.totalSale = async (req, res) => {
    try {
        const result = await Order.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: null,
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalQuantity: 1
                }
            }
        ]);

        res.status(200).json(result[0] || { totalQuantity: 0 });
    } catch (error) {
        console.error('error', error);
        res.status(500).json({ message: 'server error' });
    }
};

exports.deleteOrder = async (req, res) => {
    try {
        const deleteOrder = await Order.findByIdAndDelete(req.params.id);
        if (!deleteOrder) {
            return res.status(404).json({ message: 'order not found.' });
        }
        res.status(200).json({ message: 'order deleted successfully.' });
    } catch (error) {
        console.log('error', error);
        res.status(500).json({ message: 'An error occurred while deleting the order.' })
    }
}

// truy van doanh thu theo thang
exports.getRevenueMonthly = async (req, res) => {
    try {
        const result = await Order.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    totalRevenue: { $sum: "$totalAmount" },
                    totalInvoices: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $concat: [
                            { $toString: "$_id.year" },
                            "-",
                            {
                                $cond: [
                                    { $lt: ["$_id.month", 10] },
                                    { $concat: ["0", { $toString: "$_id.month" }] },
                                    { $toString: "$_id.month" }
                                ]
                            }
                        ]
                    },
                    totalRevenue: 1,
                    totalInvoices: 1
                }
            },
            {
                $sort: { month: 1 }
            }
        ]);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.getTopProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    productName: { $first: "$items.productName" },
                    totalQuantity: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 3 }
        ]);

        res.status(200).json(topProducts);
    } catch (error) {
        console.error('Error getting top products:', error);
        res.status(500).json({ message: 'An error occurred while getting top products.' });
    }
}

exports.getTopEmployees = async (req, res) => {
    try {
        const topEmployees = await Order.aggregate([
            {
                $group: {
                  _id: "$employeeId",
                  totalSales: { $sum: "$totalAmount" }
                }
              },
              {
                $lookup: {
                  from: "NhanVien",
                  localField: "_id",
                  foreignField: "employeeId",
                  as: "employeeDetails"
                }
              },
              {
                $unwind: "$employeeDetails"
              },
              {
                $project: {
                  totalSales: 1,
                  employeeName: "$employeeDetails.name"
                }
              },
              {
                $sort: { totalSales: -1 }
              }
        ]);
        res.status(200).json(topEmployees);
    } catch (error) {
        console.error('Error getting top employees:', error);
        res.status(500).json({ message: 'An error occurred while getting top employees.' });
    }
}