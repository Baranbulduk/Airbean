import { Router } from "express";
import userSchema from "../models/userModel.js";
import nedb from 'nedb-promises'; import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const usersDB = new nedb({ filename: 'users.db', autoload: true });
const router = Router();

// Inloggningsrutt
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { error } = userSchema.validate(req.body);
        if (error) {
            console.log('Validation error:', error.details[0].message);
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const { username, password } = req.body;
        const user = await usersDB.findOne({ username });
        if (!user) {
            console.log('Användare inte hittad');
            return res.status(400).json({ success: false, message: 'Användare inte hittad' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('Ogiltigt lösenord');
            return res.status(400).json({ success: false, message: 'Ogiltigt lösenord' });
        }

        const token = jwt.sign({ username: user.username, role: user.role }, 'your_jwt_secret', { expiresIn: '1h' });
        res.json({ success: true, token });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error });
    }
});

router.post('/register', async (req, res) => {
    try {
        console.log('Registration attempt:', req.body);
        const { error } = userSchema.validate(req.body);
        if (error) {
            console.log('Validation error:', error.details[0].message);
            return res.status(400).json({ success: false, message: error.details[0].message });
        }
        const { username, password } = req.body;
        const existingUser = await usersDB.findOne({ username });

        if (existingUser) {
            console.log('User already exists:', existingUser);
            return res.status(400).json({ success: false, message: 'User already exists' });
        } else {
            await usersDB.insert({ username, password });
            console.log('User registered:', { username, password });
            return res.json({ success: true, message: 'Registration successful' });
        }
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error });
    }
});

export default router;
