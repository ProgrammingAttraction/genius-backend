const { signup, login, profile_update } = require('../Controllers/AuthController');
const ensureAuthenticated = require('../Middlewares/Auth');
const { signupValidation, loginValidation } = require('../Middlewares/AuthValidation');
const multer=require("multer")
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require("../Models/User");
const { adminregister, adminlogin } = require('../Controllers/Adminauth');
const Adminmodel = require('../Models/Admin');
const Section = require('../Models/Section');
const Classmodel = require('../Models/Classmodel');
const Routine = require('../Models/Routine');
const Exam = require('../Models/Exam');
const DailyDiary = require('../Models/Dailydairy');
// ------------file-upload----------
const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,"./public/images")
    },
    filename:function(req,file,cb){
        cb(null,`${Date.now()}_${file.originalname}`)
    }

});
const uploadimage=multer({storage:storage});

router.post('/login', login);
router.post('/admin-register', adminregister);
router.post('/admin-login',  async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Adminmodel.findOne({ email,is_active:"active",role:"admin" });
        console.log(req.body)
        console.log(admin)
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
});
// READ: Get all sections
router.get('/sections', async (req, res) => {
  try {
    const sections = await Section.find();
    res.status(200).json({ success: true, data: sections });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch sections' });
  }
});
router.get("/all-classes",async(req,res)=>{
  try {
    const all_classes=await Classmodel.find();
    res.send({success:true,data:all_classes})
  } catch (error) {
    console.log(error)
  }
})
// Get all routines
router.get('/routines',async(req,res)=>{
  try {
    const routine=await Routine.find();
    console.log(routine)
     res.send({success:true,data:routine})
  } catch (error) {
    console.log(error)
  }
});

router.get('/all-exam-routines', async (req, res) => {
  try {
    const examRoutines = await Exam.find().sort({ createdAt: -1 });
    res.status(200).json({ 
      success: true, 
      data: examRoutines 
    });
  } catch (error) {
    console.error('Error fetching exam routines:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch exam routines',
      error: error.message 
    });
  }
});
router.get('/daily-diary', async (req, res) => {
  try {
    const { className, date, day } = req.query;
    
    // Find the latest diary document
    const diary = await DailyDiary.findOne().sort({ createdAt: -1 });
    if (!diary) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Filter entries if query parameters are provided
    let filteredEntries = diary.entries;
    if (className) {
      filteredEntries = filteredEntries.filter(e => e.className === className);
    }
    if (date) {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        filteredEntries = filteredEntries.filter(e => 
          e.date.toISOString().split('T')[0] === dateObj.toISOString().split('T')[0]
        );
      }
    }
    if (day) {
      filteredEntries = filteredEntries.filter(e => e.day === day);
    }

    // Sort entries by date (newest first) and then by class name
    filteredEntries.sort((a, b) => {
      if (b.date.getTime() !== a.date.getTime()) {
        return b.date.getTime() - a.date.getTime();
      }
      return a.className.localeCompare(b.className);
    });
    
    res.json({
      success: true,
      data: filteredEntries
    });
  } catch (error) {
    console.error('Error fetching diary entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diary entries',
      error: error.message
    });
  }
});
router.put("/update-profile",ensureAuthenticated,profile_update)
module.exports = router;