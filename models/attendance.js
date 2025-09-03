const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    checkInTime: {
        type: Date,
        required: true,
    },
    checkOutTime: {
        type: Date,
    },
    totalHoursWorked: {
        type: Number,
        default: 0,
    },
});

module.exports = mongoose.model('Attendance', attendanceSchema);