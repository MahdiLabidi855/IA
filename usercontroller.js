// controllers/userController.js
const bcrypt = require('bcrypt');
const db = require('../db/models');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const { sendAccountEmail } = require('../utils/emailService');
const path = require('path');
const fs = require('fs');
const { User, Trace } = db;


const generateRandomPassword = (length = 12) => {
  return crypto.randomBytes(length).toString("base64").slice(0, length);
};

//router.post('/login', loginUserController);
const loginUserController = async (req, res) => {
  const { email, mdp } = req.body;

  try {

      const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Aucun compte trouvé avec cet email." });
    }      
    if (!user.isActive) {
      return res.status(403).json({ message: "Votre compte est désactivé. Veuillez contacter l'administrateur." });
    }
    const isMatch = await bcrypt.compare(mdp, user.mdp);
    if (!isMatch) {
        return res.status(400).json({ message: 'Mot de passe incorrect' });
    }

      // Update derConnx
    user.derConnx = new Date();
    await user.save();

    // Add Trace
    await Trace.create({
        userId: user.id,
        action: 'logging in',
        model: 'User', 
        data: {
          email: user.email,
          role: user.roleUtilisateur,
          derConnx: new Date(),
        }
      });

    // Generate JWT token
    const token = jwt.sign(
        { id: user.id, 
          role: user.roleUtilisateur,  
          username: user.username, 
          email: user.email, 
        },
            process.env.JWT_SECRET_KEY,
        { expiresIn: '9h' }
    );

    // Send token in HttpOnly cookie
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 3600000,
        sameSite: 'Lax',
    });

    res.status(200).json({
        message: 'Connexion réussie.',
        userId: user.id,
        roleUtilisateur: user.roleUtilisateur,
        mustUpdatePassword: user.mustUpdatePassword,
        username: user.username, 

    });

  } catch (error) {
      res.status(500).json({
          message: 'Erreur lors de la connexion.',
          error: error.message,
      });
  }
};
//router.get('/auth', getAuthenticatedUser);
const getAuthenticatedUser = (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Non autorisé" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    res.json({ 
      id: decoded.id, 
      email: decoded.email, 
      username: decoded.username, 
      roleUtilisateur: decoded.role 
    });
  } catch (err) {
    res.status(401).json({ message: "Token invalide" });
  }
};
//logout
const logoutUserController = async (req, res) => {
  try {
      // Clear the token cookie
      res.clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          sameSite: 'Lax',
      });

      // trace the logout action
      if (req.user) {
          await Trace.create({
              userId: req.user.id,
              action: 'user logs out',
              model: 'User',
              data: {
                  email: req.user.email,
                  role: req.user.roleUtilisateur,
                  timestamp: new Date(),
              }
          });
      }

      res.status(200).json({ message: 'Déconnexion réussie.' });

  } catch (error) {
      res.status(500).json({
          message: 'Erreur lors de la déconnexion.',
          error: error.message,

      });
  }
};
// change mdp first thing
const updatePasswordController = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    const isMatch = await bcrypt.compare(currentPassword, user.mdp);

    if (!isMatch) {
      return res.status(400).json({ message: "Mot de passe actuel incorrect" });
    }

    user.mdp = await bcrypt.hash(newPassword, 10);
    user.mustUpdatePassword = false;
    await user.save();

    await Trace.create({
      userId: user.id,
      model: 'User',
      action: 'user changed passwrod',
      data: {
        userId: user.id,
        username: user.username
      }
    });

    res.status(200).json({ message: "passwoed changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ADD
const addUserController = async (req, res) => {
    const { username, email, roleUtilisateur  } = req.body;

    try {
        // 1. Validate creator (admin or formateur)
        const creator = req.user; //get tocken 
    
        if (!['Formateur', 'Admin'].includes(creator.roleUtilisateur)) {
          return res.status(403).json({ message: 'Permission refusée.' });
        }
    
        // 2. Generate & hash random password
        const generatedPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(generatedPassword, 8);
    
        // 3. Create the new user
        const newUser = await User.create({
          username,
          email,
          mdp: hashedPassword,
          defaultMdp: hashedPassword,
          roleUtilisateur,
          isActive: true,
          derConnx: new Date(),  
        });
    
        // 4. Trace the creation
        await Trace.create({
          userId:creator.id, // the ID of the admin/formateur who created this user
          model: 'Register a new user',
          action: 'Création d\'utilisateur',
          data: {
            createdUserId: newUser.id,
            createdUsername: newUser.username,
            role: newUser.roleUtilisateur
          }
        });
    
         // Send welcome email with credentials
         await sendAccountEmail({
            email,
            username,
            password: generatedPassword
          });

        // 5. Return response
        return res.status(201).json({
          message: 'Utilisateur créé avec succès.  Un email a été envoyé;',
          user: newUser,
          generatedPassword 
        });
    }
    catch (err) {
        console.error('[ERROR] Failed to create user:', err);
        return res.status(500).json({ error: err.message });
    }
};

// GET ALL users
const getAllUsers = async (req, res) => {
  try {
    if (req.user.roleUtilisateur !== 'Admin') {
      return res.status(403).json({ message: 'Accès refusé. Seuls les administrateurs peuvent voir tous les utilisateurs.' });
    }

    const users = await User.findAll();

    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'Aucun utilisateur trouvé' });
    }

    const usersWithPhotoUrls = users.map(user => {
      // my images are served from 'backend/assets/uploads/'
      if (user.photo) {
        user.photo = `/assets/uploads/${user.photo}`;
      }
      return user;
    });

    res.status(200).json(usersWithPhotoUrls);
  } catch (err) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des utilisateurs.',
      error: err.message,
    });
  }
};
// get user by id
const getUserByIdController = async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.roleUtilisateur !== 'Admin') {
      return res.status(403).json({ message: "Accès refusé. Seul un administrateur peut accéder à cet utilisateur." });
    }

    const user = await User.findByPk(id, {
      attributes: ['id', 'username', 'email', 'roleUtilisateur', 'isActive', 'derConnx','photo', 'tel']
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.photo) {
      user.photo = `/assets/uploads/${user.photo}`;
    }

    console.log(user.tel); 
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
const getUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id, {
      attributes: ['id', 'username', 'email', 'roleUtilisateur', 'isActive', 'derConnx','photo', 'tel','firstName','lastName']
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.photo) {
      user.photo = `/assets/uploads/${user.photo}`;
    }

    console.log(user.tel); 
    return res.status(200).json({ message: 'successfully.', user });

  } catch (error) {    
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
// update user as an admin
const updateUserController = async (req, res) => {
  const userId = req.params.id;

  // Only admins can perform this update
  if (req.user.roleUtilisateur !== 'Admin') {
    return res.status(403).json({ message: 'Accès refusé. Seul l\'Admin peut mettre à jour tous les champs.' });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    // Vérifier email unique si modifié
    if (req.body.email && req.body.email !== user.email) {
      const existingEmail = await User.findOne({ where: { email: req.body.email } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
      }
    }

    // Vérifier username unique si modifié
    if (req.body.username && req.body.username !== user.username) {
      const existingUsername = await User.findOne({ where: { username: req.body.username } });
      if (existingUsername) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
      }
    }

    // Update only allowed fields
    const allowedFields = ['username', 'tel', 'roleUtilisateur', 'isActive', 'photo'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });
      
    // Handle uploaded photo
    if (req.file) {
      // Optionally delete old photo from filesystem
      if (user.photo) {
        const oldPhotoPath = path.join(__dirname, '..', 'assets', 'uploads', user.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath); //delete the old file
        }
      }
      // Update with new photo filename
      user.photo = req.file.filename;
    }
    await user.save();

    // add a trace
    await Trace.create({
      userId: req.user.id,
      action: `Admin (${req.user.username}) updated user (${user.username})`,
      model: 'User',
      data: {
        username: user.username,
        role: user.roleUtilisateur,
        tel: user.tel,
        isActive: user.isActive,
        photo: user.photo
      }
    });

    return res.status(200).json({ message: 'user updated successfully.', user });
  } catch (err) {
    return res.status(500).json({ message: 'internally error', error: err.message });
  }
};

 //GET the loged in user
 const getOnceUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, {
          attributes: ['email', 'roleUtilisateur', 'username']
        });
        
        if (!user) {
          return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
    
        res.status(200).json(user);
      } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
      }
};  
// update Profile as a formateur or apprenant
const updateProfileController = async (req, res) => {
  const userId = req.params.id;

  if (!['Formateur', 'Apprenant'].includes(req.user.roleUtilisateur)) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  if (parseInt(userId) !== req.user.id) {
    return res.status(403).json({ message: 'Vous ne pouvez modifier que votre propre profil.' });
  }

  const { username, photo, tel } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    // Vérifier username unique si modifié
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
      }
    }

    user.username = username || user.username;
    user.photo = photo || user.photo;
    user.tel = tel || user.tel;

    await user.save();
    return res.status(200).json({ message: 'Profil mis à jour avec succès.', user });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur interne.', error: err.message });
  }
};
/*
const updateUserProfileController = async (req, res) => {
  const userId = req.params.id;

  // Check if the user has the correct role
  if (!['Formateur', 'Apprenant'].includes(req.user.roleUtilisateur)) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  // Ensure users can only update their own profile
  if (parseInt(userId) !== req.user.id) {
    return res.status(403).json({ message: 'Vous ne pouvez modifier que votre propre profil.' });
  }

  // Extract the fields to update
  const { username, photo, tel, firstName, lastName, occupation, bio } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    // Verify the username is unique if it's being modified
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
      }
    }

    // Update fields
    user.username = username || user.username;
    user.photo = photo || user.photo;
    user.tel = tel || user.tel;
    user.firstName = firstName || user.firstName;  // New field
    user.lastName = lastName || user.lastName;    // New field
    user.occupation = occupation || user.occupation;  // New field
    user.bio = bio || user.bio;   

    await user.save();
    return res.status(200).json({ message: 'Profil mis à jour avec succès.', user });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur interne.', error: err.message });
  }
};*/

const updateUserProfileController = async (req, res) => {
  const userId = parseInt(req.params.id);

  if (!['Formateur', 'Apprenant'].includes(req.user.roleUtilisateur)) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  if (userId !== req.user.id) {
    return res.status(403).json({ message: 'Vous ne pouvez modifier que votre propre profil.' });
  }

  const { username, tel, firstName, lastName, occupation, bio, email } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
      }
    }

    // Handle image upload
    let photo = user.photo;
    if (req.file) {
      // Delete old photo if it exists
      if (photo && fs.existsSync(path.join(__dirname, "..", photo))) {
        fs.unlinkSync(path.join(__dirname, "..", photo));
      }
      photo = `${req.file.filename}`; // ✅ Save relative URL
    }

    // Update user fields
    user.username = username || user.username;
    user.email = email || user.email;
    user.tel = tel || user.tel;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.occupation = occupation || user.occupation;
    user.bio = bio || user.bio;
    user.photo = photo;

    await user.save();

    const updatedUser = {
      ...user.toJSON(),
      photo: user.photo ? `${req.protocol}://${req.get('host')}${user.photo}` : null,
    };

    return res.status(200).json({ message: 'Profil mis à jour avec succès.', user: updatedUser });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ message: 'Erreur interne.', error: err.message });
  }
};




//************************ NEEDS TO BE UPDATED ***************************/

const toggleUserActivation = async (req, res) => {
const userId = req.params.id;

try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({ message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'}.`, user });
} catch (err) {
    res.status(500).json({ error: err.message });
}
};

//get user by name 
const getUserByName = async (req, res) => {
    const { name } = req.params;

    try {
        const user = await User.findOne({ where: { username: name } });

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        res.status(200).json({
            message: 'Utilisateur récupéré avec succès.',
            user,
        });

    } catch (err) {
        res.status(500).json({
            message: 'Erreur lors de la récupération de l\'utilisateur.',
            error: err.message,
        });
    }
};

//delete user (soft delete)
exports.deleteUser = async (req, res) => {
    try {
    const { id } = req.params;

    // First check if user exists
    const user = await User.findByPk(id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Perform soft delete (sets deletedAt timestamp)
    await user.destroy();

    res.status(200).json({ message: 'User deleted successfully (soft delete)' });
    
    } catch (err) {
    res.status(500).json({ error: err.message });
    }
};

module.exports = {
  getAuthenticatedUser,
    addUserController,
    loginUserController,
    logoutUserController,
    updateUserController,
    toggleUserActivation,
    updatePasswordController,
    updateProfileController,
    getUserByIdController,
    getAllUsers,
    getOnceUser, 
    getUserByName,
    getUser,
    updateUserProfileController
};