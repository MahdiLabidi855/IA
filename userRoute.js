// backend/routes/userRoute.js
const express = require('express');
const router = express.Router();
const {User} = require("../db/models");
const upload = require('../utils/multerConfig'); // Adjust path if needed
const authenticateToken = require('../utils/authMiddleware');
const { addUserController, loginUserController, logoutUserController, 
        updatePasswordController, getAllUsers, getOnceUser, getUserByName,
        updateUserController, updateProfileController, getUserByIdController,
        getAuthenticatedUser,getUser,updateUserProfileController, } = require('../controllers/userController'); // On utilise maintenant userController pour tout

router.get('/auth', getAuthenticatedUser);
router.post('/login', loginUserController);
router.post("/change-password", authenticateToken, updatePasswordController);
router.post('/register', authenticateToken, addUserController);
router.post('/logout', authenticateToken,logoutUserController);
router.get('/getOnce', authenticateToken, getOnceUser);
router.put('/edit/:id', authenticateToken, upload.single('photo'), updateUserController);
router.get('/getAll', authenticateToken, getAllUsers);
router.get('/getById/:id', authenticateToken, getUserByIdController);
router.get('/getUser/:id', authenticateToken, getUser);
router.put('/profile/:id', authenticateToken, updateProfileController);
router.put('/UpdateUser/:id', upload.single("photo") ,authenticateToken,updateUserProfileController);


router.get('/:name', getUserByName);
router.get('/login', (req, res) => {
  res.json({ message: 'Bienvenue sur le dashboard admin', user: req.user });
});

module.exports = router;