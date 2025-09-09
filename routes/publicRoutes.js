const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Token = require('../models/token');
const Attendance = require('../models/attendance');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// @route   POST /api/request-token
// @desc    Request a login token
router.post('/request-token', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }
        const token = Math.random().toString(36).substring(2, 8).toUpperCase();
        const salt = await bcrypt.genSalt(10);
        const hashedToken = await bcrypt.hash(token, salt);

        await Token.findOneAndDelete({ email });
        await new Token({ email, token: hashedToken }).save();

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Attendance System Login Token',
            text: `Your one-time login token is: ${token}. It is valid for 5 minutes.`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ msg: 'Error sending email.' });
            }
            res.status(200).json({ msg: 'Token sent to your email.' });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


router.post('/check-in', async (req, res) => {
    const { email, token } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        const tokenRecord = await Token.findOne({ email });
        if (!tokenRecord) {
            return res.status(400).json({ msg: 'Invalid or expired token.' });
        }

        const isMatch = await bcrypt.compare(token, tokenRecord.token);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid token.' });
        }

        const existingAttendance = await Attendance.findOne({
            userId: user._id,
            checkOutTime: null,
        });
        if (existingAttendance) {
            return res.status(400).json({ msg: 'You are already checked in.' });
        }

        await new Attendance({ userId: user._id, checkInTime: new Date() }).save();
        await Token.findOneAndDelete({ email });

        const payload = {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            },
        };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, jwtToken) => {
            if (err) throw err;
            res.json({ msg: 'Check-in successful.', token: jwtToken, user: payload.user });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


router.post('/check-out', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const attendanceRecord = await Attendance.findOne({
            userId: userId,
            checkOutTime: null,
        }).sort({ checkInTime: -1 });

        if (!attendanceRecord) {
            return res.status(400).json({ msg: 'You are not checked in.' });
        }

        const checkOutTime = new Date();
        const checkInTime = attendanceRecord.checkInTime;
        const totalHoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

        attendanceRecord.checkOutTime = checkOutTime;
        attendanceRecord.totalHoursWorked = totalHoursWorked.toFixed(2);
        await attendanceRecord.save();

        res.status(200).json({ msg: 'Check-out successful.', totalHours: totalHoursWorked.toFixed(2) });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-__v');
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
