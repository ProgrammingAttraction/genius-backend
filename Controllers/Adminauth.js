const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Adminmodel = require('../Models/Admin');


const adminregister=async(req,res)=>{
     try {
        const {name,email,password}=req.body;
        const exist_admin=await Adminmodel.findOne({email:email})
        if(exist_admin){
              return res.send({success:false,message:"Email already exist!"})
        }
        const hashpassword=await bcrypt.hash(password,10)
        const newAdmin=new Adminmodel({
            name,
            email,
            password:hashpassword,
        });
        newAdmin.save();
            res.send({success:true,message:"Account created successfully!"})

     } catch (error) {
        console.log(error)
     }
}

const adminlogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Adminmodel.findOne({ email,is_active:"active",role:"admin" });
        const errorMsg = 'Auth failed email or password is wrong';
        if (!admin) {
            return res.json({ message: errorMsg, success: false });
        }
        const isPassEqual = await bcrypt.compare(password, admin.password);
        if (!isPassEqual) {
            return res.json({ message:"Email and Password did not match!", success: false });
        }
        const jwtToken = jwt.sign(
            { email: admin.email, _id: admin._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        )

        res.status(200)
            .json({
                message: "Login Success",
                success: true,
                token:jwtToken,
                admin
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
adminregister,
adminlogin
}