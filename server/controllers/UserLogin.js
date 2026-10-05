
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt');
const User = require("../schemas/User");


const GenToken = async (userId) => {
    const exp = '5h';
    const RefreshToken = jwt.sign({ id: userId }, process.env.SECRET_KEY, {
        expiresIn: exp,
    });
    return RefreshToken;
};

const LoginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res
            .status(401)
            .json({ success: false, message: 'All fields are required.' });
    }
    try {
        const myUser = await User.findOne({ email });

        if (!myUser) {
            return res
                .status(404)
                .json({ success: false, message: 'User is not registered' });
        }
        const myUserHash = myUser.passwordHash;
        const bool = await bcrypt.compare(password, myUserHash);

        if (bool == false) {
            return res
                .status(401)
                .json({ success: false, message: 'Password is incorrect' });
        }
        const token = await GenToken(myUser._id);
        return res
            .status(200)
            .json({ success: true, message: 'Login Successfull', token });
    } catch (error) {
        return res.status(400).json({ success: false, message: `Error: ${error}` });
    }
};

const HashPassword = async (password) => {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedpassword = await bcrypt.hash(password, salt);

    return hashedpassword;
};

const RegisterUser = async (req, res) => {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
        return res
            .status(401)
            .json({ success: false, message: 'All fields are required.' });
    }
    if (password != confirmPassword) {
        return res.send(406).json({
            success: false,
            message: 'Password and ConfirmPassword does not match.',
        });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res
                .status(406)
                .json({ success: false, message: 'User Already Exists' });
        }

        const userHashPassword = await HashPassword(password);

        const myUser = new User({
            name: fullName,
            email: email,
            passwordHash: userHashPassword,
        });
        console.log(myUser);

        await myUser.save();

        res.status(201).json({ success: true, message: 'User Created' });
    } catch (error) {
        console.error(" ERROR:", error);

        return res.status(400).json({
            message: "Error while registering user ",
            error: error.message,
            stack: error.stack
        });
    }
};

const GetUserProfile = async (req, res) => {
  try {
    const userId = req._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    const user = await User.findById(userId).select("-PasswordHash");
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};


module.exports={
    LoginUser,
    RegisterUser,
    GetUserProfile
};