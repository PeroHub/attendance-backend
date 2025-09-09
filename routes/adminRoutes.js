const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Attendance = require('../models/attendance');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');


router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin@dept.com' && password === 'admin123') { 
        const payload = {
            user: {
                id: 'admin',
            },
        };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } else {
        res.status(401).json({ msg: 'Invalid Credentials' });
    }
});


router.post('/add-staff', auth, async (req, res) => {
    const { email, firstName, lastName } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User with this email already exists.' });
        }
        user = new User({ email, firstName, lastName });
        await user.save();
        res.status(201).json({ msg: 'Staff member added successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


router.get('/total-staff', auth, async (req, res) => {
    try {
        const totalStaff = await User.countDocuments();
        res.status(200).json({ totalStaff });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


router.delete('/remove-staff/:email', auth, async (req, res) => {
    const { email } = req.params;
    try {
        const user = await User.findOneAndDelete({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }
        res.status(200).json({ msg: 'Staff member removed successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


router.get('/attendance-records', auth, async (req, res) => {
    try {
        const { startDate, endDate, email } = req.query;
        let filter = {};

        if (startDate && endDate) {
            filter.checkInTime = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        if (email) {
            const user = await User.findOne({ email });
            if (user) {
                filter.userId = user._id;
            } else {
                return res.status(404).json({ msg: 'User not found.' });
            }
        }
        
        const records = await Attendance.find(filter).populate('userId', 'email firstName lastName');

        res.status(200).json(records);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;