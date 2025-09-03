const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require("../Models/User");
const Student = require('../Models/Student');
const Teacher = require('../Models/Teacher');

const signup = async (req, res) => {

}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(req.body);

        let user = null;
        let userType = null;

        // First, try to find the user in the Student collection
        user = await Student.findOne({ id: email });

        if (user) {
            userType = 'student';
        } else {
            // If not found in Student, try Teacher
            user = await Teacher.findOne({ id: email });

            if (user) {
                userType = 'teacher';
            }
        }

        // If user not found in both collections
        if (!user) {
            return res.json({ message: 'ID Number is incorrect!', success: false });
        }

        // Compare password with the hashed one in the DB
        const isPassEqual = await bcrypt.compare(password, user.password);
        if (!isPassEqual) {
            return res.json({ message: "Email and Password did not match!", success: false });
        }

        // Sign JWT token
        const jwtToken = jwt.sign(
            { email: user.email, _id: user._id, type: userType },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send success response
        return res.status(200).json({
            message: "Login Success",
            success: true,
            token: jwtToken,
            userData:user,
            type: userType
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: 'Server error',
            success: false
        });
    }
};
const profile_update = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await UserModel.findOne({ email });
        if(user){
            const hash_password=await bcrypt.hash(password,10)
            UserModel.findByIdAndUpdate({_id:user._id},{email:email,password:hash_password})
        }
        console.log(user)
        res.status(200)
            .json({
                message: "Login Success",
                success: true,
                admin_data:user
            })
    } catch (err) {
        console.log(err)
        res.status(500)
            .json({
                message: err,
                success: false
            })
    }
}
module.exports = {
    signup,
    login,
    profile_update
}