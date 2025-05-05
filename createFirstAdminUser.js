// utils/createFirstAdminUser.js
const { User } = require('../db/models');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');


async function createFirstAdminUser() {
  const loginUrl = `${process.env.FRONTEND_URL}/signin`;
  try {
    const existingAdmin = await User.findOne({ where: { roleUtilisateur: 'Admin' } });

    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      return;
    }

    const randomPassword = uuidv4().slice(0, 10);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const adminUser = await User.create({
      email: process.env.ADMIN_EMAIL,
      mdp: hashedPassword,
      defaultMdp: hashedPassword,
      username: 'Default_Admin',
      firstName:'AdminFN',
      lastName:'AdminLN',
      roleUtilisateur: 'Admin',
      isActive: true
    });

    console.log('Admin user created successfully');

    // Generate JWT token
    const token = jwt.sign(
      { id: adminUser.id, role: adminUser.roleUtilisateur },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '9h' }
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminUser.email,
      subject: 'Your Account Credentials',
      text: `Welcome to the platform!\n\n
            Email: ${adminUser.email}\n
            Password: ${randomPassword}\n
            Cliquez ici pour vous connecter: ${loginUrl}`
    });

    console.log('Admin credentials sent to email');
    console.log('Admin Auth Token:', token);
  } catch (err) {
    console.error('Error creating admin user:', err);
  }
}

module.exports = createFirstAdminUser;
