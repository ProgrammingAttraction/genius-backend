const express = require('express');
const Adminrouter = express.Router();
const multer = require('multer');
const path = require('path');
const Student = require('../Models/Student');
const Teacher = require('../Models/Teacher');
const bcrypt=require("bcryptjs");
const Classmodel = require('../Models/Classmodel');
const Section = require('../Models/Section');
const mongoose=require("mongoose")
const fs = require('fs');
const Routine = require('../Models/Routine');
const Exam = require('../Models/Exam');
const DailyDiary = require('../Models/Dailydairy');
const Notification = require('../Models/Notification');
const Attendance = require('../Models/Attendence');
const Examname = require('../Models/Examname');
const ImagePost = require('../Models/ImagePost');
const Notice = require('../Models/Notice');
// ------------file-upload----------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const uploadimage = multer({ storage: storage });


// ---------------all-countation-------------------------------
// Dashboard Statistics Route
Adminrouter.get('/dashboard/stats', async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Calculate start of the week (Sunday)
    const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    // 30 days ago
    const monthStart = new Date(today);
    monthStart.setDate(today.getDate() - 30);
    monthStart.setHours(0, 0, 0, 0);

    // Execute all queries in parallel
    const [
      totalStudents,
      totalTeachers,
      attendanceRecords,
      examsToday,
      thisWeekStudents,
      thisWeekTeachers,
      lastMonthStudents,
      lastMonthTeachers
    ] = await Promise.all([
      Student.countDocuments({ educationStatus: 'active' }),
      Teacher.countDocuments(),
      Attendance.aggregate([
        {
          $match: {
            date: { $gte: todayStart, $lte: todayEnd }
          }
        },
        { $unwind: '$students' },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: {
              $sum: { $cond: [{ $eq: ['$students.present', true] }, 1, 0] }
            },
            late: {
              $sum: { $cond: [{ $eq: ['$students.late', true] }, 1, 0] }
            }
          }
        }
      ]),
      Exam.aggregate([
        { $unwind: '$examRoutine' },
        {
          $match: {
            'examRoutine.date': { $gte: todayStart, $lte: todayEnd }
          }
        },
        { $count: 'total' }
      ]),
      Student.countDocuments({ createdAt: { $gte: weekStart } }),
      Teacher.countDocuments({ createdAt: { $gte: weekStart } }),
      Student.countDocuments({ createdAt: { $gte: monthStart } }),
      Teacher.countDocuments({ createdAt: { $gte: monthStart } })
    ]);

    // Attendance rate calculation
    const attendanceData = attendanceRecords[0] || { total: 0, present: 0, late: 0 };
    const attendanceRate = attendanceData.total > 0
      ? Math.round(((attendanceData.present + attendanceData.late * 0.5) / attendanceData.total) * 100)
      : 0;

    const examsTodayCount = examsToday[0]?.total || 0;

    // Percent change helpers
    const getPercentChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const studentGrowthPercent = getPercentChange(thisWeekStudents, lastMonthStudents);
    const teacherGrowthPercent = getPercentChange(thisWeekTeachers, lastMonthTeachers);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        attendanceRate,
        examsToday: examsTodayCount,
        thisWeekStudents,
        thisWeekTeachers,
        studentGrowthPercent,
        teacherGrowthPercent
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
Adminrouter.get('/recent-activities', async (req, res) => {
  try {
    // Fetch latest 5 students
    const students = await Student.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name createdAt');

    // Fetch latest 5 teachers
    const teachers = await Teacher.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name createdAt');

    // Fetch latest 5 exam routines
    const examRoutines = await Exam.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('createdAt examRoutine');

    // Format data
    const studentActivities = students.map(s => ({
      message: `New student registered: ${s.name}`,
      time: s.createdAt
    }));

    const teacherActivities = teachers.map(t => ({
      message: `New teacher added: ${t.name}`,
      time: t.createdAt
    }));

    const examActivities = examRoutines.map(e => ({
      message: `Exam routine created with ${e.examRoutine.length} entry(ies)`,
      time: e.createdAt
    }));

    // Merge and sort by time
    const allActivities = [...studentActivities, ...teacherActivities, ...examActivities]
      .sort((a, b) => new Date(b.time) - new Date(a.time));

    // Format time string for frontend
    const activities = allActivities.map(act => ({
      message: act.message,
      time: new Date(act.time).toLocaleString()
    }));

    res.status(200).json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ success: false, message: 'Failed to load recent activities' });
  }
});
// Create a new student
Adminrouter.post('/create-student',uploadimage.single("profilePic"),async(req,res)=>{
       try {
      const {
        id, name, fatherName, motherName, address, gender, birthdate,
        mobile, email, password, classRoll, studentClass, section,group,religion
      } = req.body;
        console.log(req.body)
      // Check if profile picture was uploaded
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Profile picture is required' });
      }

      const profilePicPath = req.file.filename;

      // Check if student ID or email already exists
      const existingStudent = await Student.findOne({ $or: [{ id }, { email }] });
      if (existingStudent) {
        return res.status(400).json({ 
          success: false, 
          message: existingStudent.id === id ? 'Student ID already exists' : 'Email already exists' 
        });
      }
       const hashpassword=await bcrypt.hash(password,10)
      const newStudent = new Student({
        id,
        name,
        fatherName,
        motherName,
        address,
        gender,
        birthdate,
        mobile,
        email,
        password:hashpassword,
        classRoll,
        studentClass,
        section,
        profilePic: profilePicPath,
        group,
        religion
      });

      await newStudent.save();

      res.status(201).json({ 
        success: true, 
        message: 'Student created successfully',
        data: newStudent
      });
    } catch (error) {
        console.log(error)
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
});

// Get all students
Adminrouter.get('/', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.status(200).json({ 
      success: true, 
      count: students.length,
      data: students 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
// -------------all-student-----------------
Adminrouter.get('/students', async (req, res) => {
  try {
    const student = await Student.find();
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    res.status(200).json({ 
      success: true, 
      data: student 
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
// Get students by class
Adminrouter.get('/search-students', async (req, res) => {
  try {
    const query = {};
    
    if (req.query.classId) {
      query.studentClass = req.query.classId;
    }
    
    if (req.query.sectionId) {
      query.section = req.query.sectionId;
    }
    
    const students = await Student.find(query);
    
    res.status(200).json({ 
      success: true, 
      data: students 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
// Get a single student by ID
Adminrouter.get('/student/:id', async (req, res) => {
  try {
    // console.log(res.params.id)

    const student = await Student.findOne({ _id: req.params.id});
    console.log(student)
    if (!student) {
      return res.json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    res.status(200).json({ 
      success: true, 
      data: student 
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
// ------------------class-student-filter---------------------
Adminrouter.get('/class-student/:id', async (req, res) => {
  try {
    // console.log(res.params.id)

    const student = await Student.find({ studentClass: req.params.id});
    console.log(student)
    if (!student) {
      return res.json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    res.status(200).json({ 
      success: true, 
      data: student 
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
// Update a student
Adminrouter.put('/update-student/:id', uploadimage.single("profilepic"), async (req, res) => {
  try {
    console.log(req.params)
    const student = await Student.findById({_id: req.params.id });
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    const updates = req.body;
    if (req.file) {
      updates.profilePic = req.file.path;
    }

    Object.keys(updates).forEach(key => {
      student[key] = updates[key];
    });

    await student.save();

    res.status(200).json({ 
      success: true, 
      message: 'Student updated successfully',
      data: student 
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
// Delete multiple students at once
Adminrouter.delete('/delete-students', async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    // Check if studentIds is provided and is an array
    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of student IDs to delete' 
      });
    }

    // Delete all students with IDs in the array
    const result = await Student.deleteMany({ 
      _id: { $in: studentIds } 
    });

    // Check if any students were deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No students found with the provided IDs' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: `Successfully deleted ${result.deletedCount} students`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
// Delete a student
Adminrouter.delete('/delete-student/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete({ _id: req.params.id });
    if (!student) {
      return res.json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    res.status(200).json({ 
      success: true, 
      message: 'Student deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});


// Create a new teacher (updated to match model and previous style)
Adminrouter.post('/create-teacher', uploadimage.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'nidPhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      id, 
      name, 
      fatherName, 
      motherName, 
      address, 
      gender, 
      education, 
      subject, 
      mobile, 
      email, 
      password,
      nidNumber,
      emergencyContact
    } = req.body;
    
    // Check for existing teacher (now includes nidNumber check)
    const existingTeacher = await Teacher.findOne({ 
      $or: [{ id }, { email }, { nidNumber }] 
    });
    
    if (existingTeacher) {
      // Clean up uploaded files if exists
      if (req.files) {
        if (req.files.profilePic) fs.unlinkSync(req.files.profilePic[0].path);
        if (req.files.nidPhoto) fs.unlinkSync(req.files.nidPhoto[0].path);
      }
      
      let errorField;
      if (existingTeacher.id === id) errorField = 'ID';
      else if (existingTeacher.email === email) errorField = 'email';
      else errorField = 'NID number';
      
      return res.status(400).json({ 
        error: `Teacher with this ${errorField} already exists` 
      });
    }

    // Create new teacher with all model fields
    const teacher = new Teacher({
      id,
      name,
      fatherName,
      motherName,
      address,
      gender,
      education,
      subject,
      mobile,
      email,
      password,
      nidNumber,
      emergencyContact,
      profilePic: req.files.profilePic ? req.files.profilePic[0].filename : '',
      nidPhoto: req.files.nidPhoto ? req.files.nidPhoto[0].filename : ''
    });

    await teacher.save();

    // Response matches previous format but includes new fields
    res.status(201).json({
      message: 'Teacher created successfully',
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        mobile: teacher.mobile,
        profilePic: teacher.profilePic,
        nidNumber: teacher.nidNumber
      }
    });
  } catch (err) {
    // Error handling maintains previous style
    if (req.files) {
      if (req.files.profilePic) fs.unlinkSync(req.files.profilePic[0].path);
      if (req.files.nidPhoto) fs.unlinkSync(req.files.nidPhoto[0].path);
    }
    
    console.error('Teacher creation error:', err);
    res.status(500).json({ 
      error: 'Failed to create teacher',
      systemError: err.message 
    });
  }
});


// Get all teachers
Adminrouter.get('/all-teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password');
    console.log(teachers)
    res.json({success:true,data:teachers});
  } catch (err) {
    console.error('Error fetching teachers:', err);
    res.status(500).json({ error: 'Server error while fetching teachers' });
  }
});

// Get a single teacher by ID
Adminrouter.get('/teacher/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id });
    console.log(req.params.id)
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(teacher);
  } catch (err) {
    console.error('Error fetching teacher:', err);
    res.status(500).json({ error: 'Server error while fetching teacher' });
  }
});

// Update a teacher
Adminrouter.put('/teacher/:id', uploadimage.single('profilePic'), async (req, res) => {
  try {
    const { name, fatherName, motherName, address, gender, education, subject, mobile, email } = req.body;
    
    const teacher = await Teacher.findOne({ _id: req.params.id });
    if (!teacher) {
      // Delete uploaded file if teacher doesn't exist
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.json({ error: 'Teacher not found' });
    }

    // Check if email is being changed to one that already exists
    if (email && email !== teacher.email) {
      const emailExists = await Teacher.findOne({ email });
      if (emailExists) {
        // Delete uploaded file if email exists
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update fields
    teacher.name = name || teacher.name;
    teacher.fatherName = fatherName || teacher.fatherName;
    teacher.motherName = motherName || teacher.motherName;
    teacher.address = address || teacher.address;
    teacher.gender = gender || teacher.gender;
    teacher.education = education || teacher.education;
    teacher.subject = subject || teacher.subject;
    teacher.mobile = mobile || teacher.mobile;
    teacher.email = email || teacher.email;
    
    // Handle profile picture update
    if (req.file) {
      // Delete old profile picture if it exists
      if (teacher.profilePic) {
        const oldImagePath = path.join(__dirname, '../', teacher.profilePic);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      teacher.profilePic = `/uploads/teachers/${req.file.filename}`;
    }

    teacher.updatedAt = Date.now();
    await teacher.save();

    res.json({
      message: 'Teacher updated successfully',
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        profilePic: teacher.profilePic
      }
    });
  } catch (err) {
    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error updating teacher:', err);
    res.status(500).json({ error: 'Server error while updating teacher' });
  }
});

// Delete a teacher
Adminrouter.delete('/delete-teacher/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete({ _id: req.params.id });
    console.log(req.params.id)
    if (!teacher) {
      return res.json({ error: 'Teacher not found' });
    }

    // Delete profile picture if it exists
    if (teacher.profilePic) {
      const imagePath = path.join(__dirname, '../', teacher.profilePic);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    console.error('Error deleting teacher:', err);
    res.status(500).json({ error: 'Server error while deleting teacher' });
  }
});
// Update teacher password
Adminrouter.put('/teacher/update-password/:id', async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Find teacher
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, teacher.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    teacher.password = hashedPassword;
    teacher.updatedAt = Date.now();
    await teacher.save();

    res.json({ 
      success: true,
      message: 'Password updated successfully' 
    });

  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error while updating password' 
    });
  }
});
// Delete all teachers
Adminrouter.delete('/delete-all-teachers', async (req, res) => {
  try {
    // Get all teachers first to delete their profile pictures
    const teachers = await Teacher.find();
    
    // Delete all profile pictures
    teachers.forEach(teacher => {
      if (teacher.profilePic) {
        const imagePath = path.join(__dirname, '../', teacher.profilePic);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    });

    // Delete all teachers from database
    const result = await Teacher.deleteMany({});
    
    res.json({ 
      success: true,
      message: `Successfully deleted ${result.deletedCount} teachers` 
    });
  } catch (err) {
    console.error('Error deleting all teachers:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server error while deleting all teachers' 
    });
  }
});
// -----------------------class-route-----------------------
// CREATE: Add a new class
Adminrouter.post('/new-class', async (req, res) => {
  const { className, classTeacher } = req.body;
  console.log(req.body)
  if (!className || !classTeacher) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const matchedclass=await Classmodel.findOne({className:className});
    if(matchedclass){
    return res.json({success:false, message: 'Class already exist!'});
    }
    const newClass = new Classmodel({ className, classTeacher });
    await newClass.save();
    res.status(201).json({success:true,message: 'Class added successfully', class: newClass });
  } catch (error) {
    console.error('Error saving class:', error);
    res.status(500).json({ message: 'Failed to add class' });
  }
});

// READ: Get all classes
Adminrouter.get("/all-classes",async(req,res)=>{
  try {
    const all_classes=await Classmodel.find();
    res.send({success:true,data:all_classes})
  } catch (error) {
    console.log(error)
  }
})

// UPDATE: Update class by ID
Adminrouter.put('/class/:id', async (req, res) => {
  const { className, classTeacher } = req.body;

  if (!className || !classTeacher) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const updatedClass = await Classmodel.findByIdAndUpdate(
      req.params.id,
      { className, classTeacher },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.status(200).json({ message: 'Class updated successfully', class: updatedClass });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update class' });
  }
});

// DELETE: Delete class by ID
Adminrouter.delete('/class/:id', async (req, res) => {
  try {
    const deletedClass = await Classmodel.findByIdAndDelete(req.params.id);

    if (!deletedClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.status(200).json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete class' });
  }
});
// DELETE: Delete all classes
Adminrouter.delete('/delete-all-classes', async (req, res) => {
  try {
    // Optional: Add authentication/authorization check here if needed
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ message: 'Unauthorized' });
    // }

    const result = await Classmodel.deleteMany({});
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No classes found to delete' });
    }

    res.status(200).json({ 
      message: 'All classes deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting all classes:', error);
    res.status(500).json({ message: 'Failed to delete all classes' });
  }
});

// CREATE: Add a new section
Adminrouter.post('/sections', async (req, res) => {
  const { sectionName, sectionType } = req.body;

  try {
    const newSection = new Section({
      sectionName,
      sectionType,
    });
    await newSection.save();
    res.status(201).json({ success: true, data: newSection });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create section' });
  }
});

// READ: Get all sections
Adminrouter.get('/sections', async (req, res) => {
  try {
    const sections = await Section.find();
    res.status(200).json({ success: true, data: sections });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch sections' });
  }
});

// READ: Get a single section by ID
Adminrouter.get('/sections/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    res.status(200).json({ success: true, data: section });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch section' });
  }
});
// UPDATE: Update a section by ID
Adminrouter.put('/sections/:id', async (req, res) => {
  const { id } = req.params;
  const { sectionName, sectionType } = req.body;

  try {
    const updatedSection = await Section.findByIdAndUpdate(
      id,
      { sectionName, sectionType },
      { new: true, runValidators: true }
    );

    if (!updatedSection) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    res.status(200).json({ success: true, data: updatedSection });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update section' });
  }
});

// UPDATE: Edit a section by ID
Adminrouter.put('/student/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const updatedStudent = await Student.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.status(200).json({ success: true, data: updatedStudent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update student' });
  }
});


// DELETE: Remove a section by ID
Adminrouter.delete('/sections/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedSection = await Section.findByIdAndDelete(id);
    if (!deletedSection) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    res.status(200).json({ success: true, message: 'Section deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete section' });
  }
});

// DELETE: Remove a section or student by ID
// DELETE: Remove multiple sections
Adminrouter.post('/sections/delete-multiple', async (req, res) => {
  const { sectionIds } = req.body;

  if (!sectionIds || !Array.isArray(sectionIds) || sectionIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No sections selected' });
  }

  try {
    const result = await Section.deleteMany({ _id: { $in: sectionIds } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'No sections found to delete' });
    }

    res.status(200).json({ 
      success: true, 
      message: `${result.deletedCount} section(s) deleted successfully` 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete sections' });
  }
});
// Submit attendance for a class
Adminrouter.post('/attendance', async (req, res) => {
  try {
    const { classId, sectionId, date, attendance, createdBy } = req.body;

    if (!classId || !date || !attendance || !createdBy) {
      return res.status(400).json({ success: false, message: 'Class ID, date, attendance data, and createdBy are required' });
    }

    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    // Check if attendance already exists for this class/section/date
    const existingAttendance = await Attendance.findOne({
      classId,
      sectionId: sectionId || null,
      date: attendanceDate
    });

    const studentIds = Object.keys(attendance);
    const notificationOps = [];

    // Prepare the students array for the attendance record
    const studentsAttendance = studentIds.map(studentId => {
      const studentAttendance = attendance[studentId];
      let status = {};
      let statusText;

      if (studentAttendance.present) {
        status = { present: true, absent: false, late: false };
        statusText = 'উপস্থিত';
      } else if (studentAttendance.absent) {
        status = { present: false, absent: true, late: false };
        statusText = 'অনুপস্থিত';
      } else if (studentAttendance.late) {
        status = { present: false, absent: false, late: true };
        statusText = 'বিলম্বিত';
      } else {
        throw new Error(`Invalid attendance status for student ${studentId}`);
      }

      // Prepare notification for each student
      notificationOps.push({
        studentId,
        title: 'হাজিরা সংরক্ষিত হয়েছে',
        message: `${attendanceDate.toLocaleDateString('bn-BD')} তারিখের জন্য আপনার হাজিরা "${statusText}" হিসেবে চিহ্নিত করা হয়েছে।`,
        date: new Date()
      });

      return {
        studentId,
        ...status,
        remarks: studentAttendance.remarks || ''
      };
    });

    let attendanceRecord;
    if (existingAttendance) {
      // Update existing attendance record
      existingAttendance.students = studentsAttendance;
      existingAttendance.updatedAt = new Date();
      attendanceRecord = await existingAttendance.save();
    } else {
      // Create new attendance record
      attendanceRecord = await Attendance.create({
        classId,
        sectionId,
        date: attendanceDate,
        students: studentsAttendance,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Save all notifications
    await Notification.insertMany(notificationOps);

    res.status(200).json({
      success: true,
      message: 'Attendance and notifications saved successfully',
      data: {
        class: classId,
        section: sectionId,
        date: attendanceDate,
        attendanceId: attendanceRecord._id
      }
    });

  } catch (error) {
    console.error('Error submitting attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit attendance', 
      error: error.message 
    });
  }
});
Adminrouter.get('/attendance', async (req, res) =>{
  try {
    const attendence=await Attendance.find();
    res.send({data:attendence})
  } catch (error) {
    console.log(error)
  }
})



// Adminrouter.post('/attendance', async (req, res) => {
//   try {
//     const { classId, sectionId, date, attendance, createdBy, studentBased } = req.body;

//     // Common validation for both approaches
//     if (!classId || !date || !attendance) {
//       return res.status(400).json({ success: false, message: 'Class ID, date, and attendance data are required' });
//     }

//     const attendanceDate = new Date(date);
//     if (isNaN(attendanceDate.getTime())) {
//       return res.status(400).json({ success: false, message: 'Invalid date format' });
//     }

//     // Handle student-based attendance (direct student records)
//     if (studentBased) {
//       const studentIds = Object.keys(attendance);
//       const bulkOps = [];
//       const notificationOps = [];

//       for (const studentId of studentIds) {
//         const studentAttendance = attendance[studentId];
//         let status;
//         let statusText;

//         if (studentAttendance.present) {
//           status = 'present';
//           statusText = 'উপস্থিত';
//         } else if (studentAttendance.absent) {
//           status = 'absent';
//           statusText = 'অনুপস্থিত';
//         } else if (studentAttendance.late) {
//           status = 'late';
//           statusText = 'বিলম্বিত';
//         } else {
//           return res.status(400).json({ 
//             success: false,
//             message: `Invalid attendance status for student ${studentId}` 
//           });
//         }

//         const notification = {
//           title: 'হাজিরা সংরক্ষিত হয়েছে',
//           message: `${attendanceDate.toLocaleDateString('bn-BD')} তারিখের জন্য আপনার হাজিরা "${statusText}" হিসেবে চিহ্নিত করা হয়েছে।`,
//           date: new Date()
//         };

//         // Check if attendance already exists for this student/date
//         const existingAttendance = await Student.findOne({
//           _id: studentId,
//           'attendance.date': attendanceDate
//         });

//         if (existingAttendance) {
//           // Update existing attendance record
//           bulkOps.push({
//             updateOne: {
//               filter: { _id: studentId, 'attendance.date': attendanceDate },
//               update: {
//                 $set: {
//                   'attendance.$.status': status,
//                   'attendance.$.remarks': studentAttendance.remarks || '',
//                   updatedAt: new Date()
//                 },
//                 $push: {
//                   notifications: notification
//                 }
//               }
//             }
//           });
//         } else {
//           // Add new attendance record
//           bulkOps.push({
//             updateOne: {
//               filter: { _id: studentId, studentClass: classId },
//               update: {
//                 $push: {
//                   attendance: { 
//                     date: attendanceDate, 
//                     status,
//                     classId,
//                     sectionId: sectionId || null,
//                     remarks: studentAttendance.remarks || ''
//                   },
//                   notifications: notification
//                 },
//                 $set: { updatedAt: new Date() }
//               }
//             }
//           });
//         }

//         notificationOps.push({
//           studentId,
//           ...notification
//         });
//       }

//       const [bulkResult] = await Promise.all([
//         Student.bulkWrite(bulkOps),
//         Notification.insertMany(notificationOps)
//       ]);

//       if (bulkResult.modifiedCount === 0 && bulkResult.upsertedCount === 0) {
//         return res.status(404).json({ success: false, message: 'No students found or no changes made' });
//       }

//       return res.status(200).json({
//         success: true,
//         message: 'Student-based attendance and notifications saved successfully',
//         data: {
//           class: classId,
//           date: attendanceDate,
//           studentsUpdated: bulkResult.modifiedCount,
//           studentsAdded: bulkResult.upsertedCount
//         }
//       });
//     }

//     // Handle class/section-based attendance (Attendance collection + Student collection)
//     if (!createdBy) {
//       return res.status(400).json({ success: false, message: 'createdBy is required for class/section attendance' });
//     }

//     // Check if attendance already exists for this class/section/date
//     const existingAttendance = await Attendance.findOne({
//       classId,
//       sectionId: sectionId || null,
//       date: attendanceDate
//     });

//     const studentIds = Object.keys(attendance);
//     const notificationOps = [];
//     const studentBulkOps = [];

//     // Prepare the students array for both Attendance and Student records
//     const studentsAttendance = studentIds.map(studentId => {
//       const studentAttendance = attendance[studentId];
//       let status = {};
//       let statusText;
//       let studentStatus;

//       if (studentAttendance.present) {
//         status = { present: true, absent: false, late: false };
//         statusText = 'উপস্থিত';
//         studentStatus = 'present';
//       } else if (studentAttendance.absent) {
//         status = { present: false, absent: true, late: false };
//         statusText = 'অনুপস্থিত';
//         studentStatus = 'absent';
//       } else if (studentAttendance.late) {
//         status = { present: false, absent: false, late: true };
//         statusText = 'বিলম্বিত';
//         studentStatus = 'late';
//       } else {
//         throw new Error(`Invalid attendance status for student ${studentId}`);
//       }

//       // Prepare notification for each student
//       notificationOps.push({
//         studentId,
//         title: 'হাজিরা সংরক্ষিত হয়েছে',
//         message: `${attendanceDate.toLocaleDateString('bn-BD')} তারিখের জন্য আপনার হাজিরা "${statusText}" হিসেবে চিহ্নিত করা হয়েছে।`,
//         date: new Date()
//       });

//       // Prepare student record update
//       studentBulkOps.push({
//         updateOne: {
//           filter: { 
//             _id: studentId,
//             studentClass: classId 
//           },
//           update: {
//             $pull: {
//               attendance: {
//                 date: attendanceDate,
//                 classId: classId,
//                 sectionId: sectionId || null
//               }
//             }
//           }
//         }
//       });

//       studentBulkOps.push({
//         updateOne: {
//           filter: { _id: studentId },
//           update: {
//             $push: {
//               attendance: {
//                 date: attendanceDate,
//                 status: studentStatus,
//                 classId: classId,
//                 sectionId: sectionId || null,
//                 remarks: studentAttendance.remarks || ''
//               }
//             },
//             $set: { updatedAt: new Date() }
//           }
//         }
//       });

//       return {
//         studentId,
//         ...status,
//         remarks: studentAttendance.remarks || ''
//       };
//     });

//     // Save/update attendance record
//     let attendanceRecord;
//     if (existingAttendance) {
//       existingAttendance.students = studentsAttendance;
//       existingAttendance.updatedAt = new Date();
//       attendanceRecord = await existingAttendance.save();
//     } else {
//       attendanceRecord = await Attendance.create({
//         classId,
//         sectionId,
//         date: attendanceDate,
//         students: studentsAttendance,
//         createdBy,
//         createdAt: new Date(),
//         updatedAt: new Date()
//       });
//     }

//     // Update all student records and send notifications
//     await Promise.all([
//       Student.bulkWrite(studentBulkOps),
//       Notification.insertMany(notificationOps)
//     ]);

//     res.status(200).json({
//       success: true,
//       message: 'Class/section attendance and student records updated successfully',
//       data: {
//         class: classId,
//         section: sectionId,
//         date: attendanceDate,
//         attendanceId: attendanceRecord._id,
//         studentsUpdated: studentIds.length
//       }
//     });

//   } catch (error) {
//     console.error('Error submitting attendance:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Failed to submit attendance', 
//       error: error.message 
//     });
//   }
// });


// Get students by class for attendance

Adminrouter.get('/search-students', async (req, res) => {
  try {
    const { classId } = req.query;

    if (!classId) {
      return res.status(400).json({ 
        success: false,
        message: 'Class ID is required' 
      });
    }

    const students = await Student.find(
      { studentClass: classId },
      { 
        id: 1,
        name: 1,
        classRoll: 1,
        section: 1,
        profilePic: 1,
        educationStatus: 1 
      }
    ).sort({ classRoll: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No students found for this class' 
      });
    }

    res.status(200).json({ 
      success: true,
      message: 'Students retrieved successfully',
      data: students 
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch students',
      error: error.message 
    });
  }
});

// Get attendance records for a student
Adminrouter.get('/student/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid student ID' 
      });
    }

    const query = { _id: id };
    const projection = { 
      attendance: 1,
      name: 1,
      id: 1,
      studentClass: 1,
      section: 1 
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime())) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid start date format' 
        });
      }
      if (isNaN(end.getTime())) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid end date format' 
        });
      }

      query['attendance.date'] = { 
        $gte: start, 
        $lte: end 
      };
      projection.attendance = {
        $filter: {
          input: '$attendance',
          as: 'record',
          cond: {
            $and: [
              { $gte: ['$$record.date', start] },
              { $lte: ['$$record.date', end] }
            ]
          }
        }
      };
    }

    const student = await Student.findOne(query, projection);

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    res.status(200).json({ 
      success: true,
      message: 'Attendance records retrieved successfully',
      data: {
        student: {
          id: student.id,
          name: student.name,
          class: student.studentClass,
          section: student.section
        },
        attendance: student.attendance
      }
    });

  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message 
    });
  }
});
// CHANGE PASSWORD: Update student's password securely
Adminrouter.put('/student/change-password/:id', async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    // Step 1: Find the student
    const student = await Student.findById(id);
    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    // Step 2: Compare current password with stored hash
    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Current password is incorrect' });
    }

    // Step 3: Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Step 4: Update the password
    student.password = hashedPassword;
    await student.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});
// -------------------------------routine---------------------------------
Adminrouter.post('/new-routine', async function (req, res) {
  try {
    const routineData = req.body.routine;

    if (!Array.isArray(routineData) || routineData.length === 0) {
      return res.status(400).json({ success: false, message: 'Routine data is required.' });
    }

    const className = routineData[0]?.className;
    if (!className) {
      return res.status(400).json({ success: false, message: 'Class name is required in routine data.' });
    }

    const existingRoutine = await Routine.findOne({ "routine.className": className });

    if (existingRoutine) {
      // Merge or update subjects
      const updatedRoutine = [...existingRoutine.routine];

      for (const newEntry of routineData) {
        const matchIndex = updatedRoutine.findIndex(item =>
          item.day === newEntry.day &&
          item.period === newEntry.period &&
          item.subjectName === newEntry.subjectName
        );

        if (matchIndex !== -1) {
          // Update the existing subject
          updatedRoutine[matchIndex] = { ...updatedRoutine[matchIndex], ...newEntry };
        } else {
          // Add new subject
          updatedRoutine.push(newEntry);
        }
      }

      existingRoutine.routine = updatedRoutine;
      await existingRoutine.save();
      return res.status(200).json({ success: true, message: "Routine updated successfully." });

    } else {
      // Create a new routine
      const newRoutine = new Routine({ routine: routineData });
      await newRoutine.save();
      return res.status(201).json({ success: true, message: "Routine created successfully." });
    }

  } catch (error) {
    console.error('Error saving routine:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save routine.',
      error: error.message
    });
  }
});


// Get all routines
Adminrouter.get('/routines',async(req,res)=>{
  try {
    const routine=await Routine.find();
    console.log(routine)
     res.send({success:true,data:routine})
  } catch (error) {
    console.log(error)
  }
});

// Update routine by ID
Adminrouter.put('/routines/:id', async (req, res) => {
  try {
    const routineId = req.params.id;
    const { routineItemId, updatedData } = req.body;

    if (!routineItemId || !updatedData) {
      return res.status(400).json({ message: 'routineItemId and updatedData are required.' });
    }

    const routineDoc = await Routine.findById(routineId);
    if (!routineDoc) {
      return res.status(404).json({ message: 'Routine not found.' });
    }

    const routineItem = routineDoc.routine.id(routineItemId);
    if (!routineItem) {
      return res.status(404).json({ message: 'Routine item not found.' });
    }

    routineItem.set(updatedData);
    const updatedDoc = await routineDoc.save();

    res.status(200).json({ 
      message: 'Routine item updated successfully.', 
      data: updatedDoc 
    });
  } catch (err) {
    console.error('Error updating routine:', err);
    res.status(500).json({ message: 'Failed to update routine.' });
  }
});

// Delete routine by ID
Adminrouter.delete('/routines/:id', async (req, res) => {
  try {
    const routineId = req.params.id;
    const { routineItemId } = req.body;

    if (!routineItemId) {
      // If no routineItemId, delete the entire document
      const deletedRoutine = await Routine.findByIdAndDelete(routineId);
      if (!deletedRoutine) {
        return res.status(404).json({ message: 'Routine not found.' });
      }
      return res.status(200).json({ message: 'Routine deleted successfully.' });
    }

    // Delete specific item from routine array
    const routineDoc = await Routine.findById(routineId);
    if (!routineDoc) {
      return res.status(404).json({ message: 'Routine not found.' });
    }

    routineDoc.routine.pull({ _id: routineItemId });
    const updatedDoc = await routineDoc.save();

    res.status(200).json({ 
      message: 'Routine item deleted successfully.', 
      data: updatedDoc 
    });
  } catch (err) {
    console.error('Error deleting routine:', err);
    res.status(500).json({ message: 'Failed to delete routine.' });
  }
});
// Get routine by className
Adminrouter.get('/routine/:className', async (req, res) => {
  try {
    const className = req.params.className;
 console.log(className)
    if (!className) {
      return res.json({ success: false, message: 'Class name is required.' });
    }

    const routine = await Routine.findOne({ "routine.className": className });

    if (!routine) {
      return res.json({ success: false, message: 'Routine not found for this class.' });
    }

    // Filter only the relevant class routines if needed
    const filteredRoutine = routine.routine.filter(item => item.className === className);

    res.status(200).json({ success: true, data: filteredRoutine });
  } catch (error) {
    console.error('Error fetching routine by className:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch routine.', error: error.message });
  }
});

// Create new exam routine
Adminrouter.post('/new-exam-routine', async (req, res) => {
  try {
    const examData = req.body.examRoutine;

    // Validate input data
    if (!Array.isArray(examData) || examData.length === 0) {
      return res.json({ success: false, message: 'Exam routine data is required.' });
    }

    const className = examData[0]?.className;
    if (!className) {
      return res.json({ success: false, message: 'Class name is required in exam data.' });
    }

    // Find existing exam routine for this class
    const existingExamRoutine = await Exam.findOne({ 
      "examRoutine.className": className 
    });

    if (existingExamRoutine) {
      // Merge or update exam entries
      const updatedExamRoutine = [...existingExamRoutine.examRoutine];

      for (const newExam of examData) {
        const matchIndex = updatedExamRoutine.findIndex(item =>
          item.day === newExam.day &&
          item.date.getTime() === new Date(newExam.date).getTime() &&
          item.timeStart === newExam.timeStart &&
          item.subjectName === newExam.subjectName
        );

        if (matchIndex !== -1) {
          // Update existing exam entry
          updatedExamRoutine[matchIndex] = { 
            ...updatedExamRoutine[matchIndex], 
            ...newExam,
            date: new Date(newExam.date) // Ensure date is properly formatted
          };
        } else {
          // Add new exam entry
          updatedExamRoutine.push({
            ...newExam,
            date: new Date(newExam.date) // Ensure date is properly formatted
          });
        }
      }

      existingExamRoutine.examRoutine = updatedExamRoutine;
      await existingExamRoutine.save();
      return res.status(200).json({ 
        success: true, 
        message: "Exam routine updated successfully.",
        data: existingExamRoutine
      });

    } else {
      // Create new exam routine
      const newExamRoutine = new Exam({ 
        examRoutine: examData.map(exam => ({
          ...exam,
          date: new Date(exam.date) // Ensure date is properly formatted
        }))
      });
      await newExamRoutine.save();
      return res.status(201).json({ 
        success: true, 
        message: "Exam routine created successfully.",
        data: newExamRoutine
      });
    }

  } catch (error) {
    console.error('Error saving exam routine:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save exam routine.',
      error: error.message
    });
  }
});

// Get all exam routines
Adminrouter.get('/all-exam-routines', async (req, res) => {
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

// Get exam routine by ID
Adminrouter.get('/exam/:id', async (req, res) => {
  try {
    const examRoutine = await Exam.findById(req.params.id);
    if (!examRoutine) {
      return res.json({ 
        success: false, 
        message: 'Exam routine not found' 
      });
    }
    res.status(200).json({ 
      success: true, 
      data: examRoutine 
    });
  } catch (error) {
    console.error('Error fetching exam routine:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch exam routine',
      error: error.message 
    });
  }
});

// Update exam routine
// Remove an exam routine entry
Adminrouter.delete('/exam-routine/:routineId/entry/:entryId', async (req, res) => {
  try {
    const { routineId, entryId } = req.params;
    
    const updatedRoutine = await Exam.findByIdAndUpdate(
      routineId,
      { $pull: { examRoutine: { _id: entryId } } },
      { new: true }
    );
    
    if (!updatedRoutine) {
      return res.status(404).json({ message: 'Exam routine not found' });
    }
    
    res.json(updatedRoutine);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }
});

// Update an exam routine entry
Adminrouter.put('/exam-routine/:routineId/entry/:entryId', async (req, res) => {
  try {
    const { routineId, entryId } = req.params;
    const updateData = req.body;
    
    // Construct the update object dynamically
    const update = {};
    for (const key in updateData) {
      update[`examRoutine.$.${key}`] = updateData[key];
    }
    
    const updatedRoutine = await Exam.findOneAndUpdate(
      { _id: routineId, 'examRoutine._id': entryId },
      { $set: update },
      { new: true }
    );
    
    if (!updatedRoutine) {
      return res.status(404).json({ message: 'Exam routine or entry not found' });
    }
    
    res.json(updatedRoutine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get exam routines by className
Adminrouter.get('/exam/class/:className', async (req, res) => {
  try {
    const className = req.params.className;
    console.log(className)
    // Find exams and unwind the examRoutine array
    const examRoutines = await Exam.aggregate([
      { $match: { 'examRoutine.className': className } },
      { $unwind: '$examRoutine' },
      { $match: { 'examRoutine.className': className } },
      { $sort: { 'examRoutine.date': 1 } }, // Sort by date ascending
      { 
        $project: {
          _id: '$examRoutine._id',
          examType: '$examRoutine.examType',
          day: '$examRoutine.day',
          date: '$examRoutine.date',
          timeStart: '$examRoutine.timeStart',
          timeEnd: '$examRoutine.timeEnd',
          subjectName: '$examRoutine.subjectName',
          className: '$examRoutine.className',
          roomNumber: '$examRoutine.roomNumber',
          supervisor: '$examRoutine.supervisor'
        }
      }
    ]);

    if (!examRoutines || examRoutines.length === 0) {
      return res.json({ 
        success: false, 
        message: 'No exam routines found for the specified class' 
      });
    }
    console.log(examRoutines)
    res.status(200).json({ 
      success: true, 
      data: examRoutines 
    });
  } catch (error) {
    console.error('Error fetching exam routines by class:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch exam routines by class',
      error: error.message 
    });
  }
});

// Get exam routines by teacher_id
Adminrouter.get('/exam/teacher/:teacher_id', async (req, res) => {
  try {
    const teacher_id = req.params.teacher_id;
    console.log(teacher_id)
   const all_data=await Exam.find({teacher_id:teacher_id})

     const results = await Exam.aggregate([
        { $unwind: "$examRoutine" }, // Split the examRoutine array
        { $match: { "examRoutine.teacher_id": teacher_id } }, // Match routines with teacher_id
        {
          $group: {
            _id: "$_id",
            examType: { $first: "$examRoutine.examType" },
            date: { $first: "$examRoutine.date" },
            routines: { $push: "$examRoutine" } // Group matching routines
          }
        },
        { $project: { _id: 0, routines: 1 } } // Only return routines
      ]);
  console.log(results)
      if (!results || results.length === 0) {
        return res.json({
          success: false,
          message: "No exam routines found for this teacher",
        });
      }

    res.status(200).json({ 
      success: true, 
      data: results 
    });
  } catch (error) {
    console.error('Error fetching exam routines by teacher:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch exam routines by teacher',
      error: error.message 
    });
  }
});
// Custom validation function
const validateDailyDiary = (entry) => {
  const errors = {};
  const validDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  if (!entry.day || !validDays.includes(entry.day)) {
    errors.day = 'Valid day is required';
  }

  if (!entry.date || isNaN(new Date(entry.date).getTime())) {
    errors.date = 'Valid date is required';
  }

  if (!entry.className || typeof entry.className !== 'string' || entry.className.trim() === '') {
    errors.className = 'Class is required';
  }

  if (!entry.subjectName || typeof entry.subjectName !== 'string' || entry.subjectName.trim() === '') {
    errors.subjectName = 'Subject is required';
  }

  if (!entry.teacherName || typeof entry.teacherName !== 'string' || entry.teacherName.trim() === '') {
    errors.teacherName = 'Teacher is required';
  }

  if (!entry.topicCovered || typeof entry.topicCovered !== 'string' || entry.topicCovered.trim() === '') {
    errors.topicCovered = 'Topic covered is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
// Custom validation function
const validateDiaryEntry = (entry) => {
  const errors = {};
  const validDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  if (!entry.day || !validDays.includes(entry.day)) {
    errors.day = 'Valid day is required';
  }

  if (!entry.date || isNaN(new Date(entry.date).getTime())) {
    errors.date = 'Valid date is required';
  }

  if (!entry.className || typeof entry.className !== 'string' || entry.className.trim() === '') {
    errors.className = 'Class is required';
  }

  if (!entry.subjectName || typeof entry.subjectName !== 'string' || entry.subjectName.trim() === '') {
    errors.subjectName = 'Subject is required';
  }

  if (!entry.teacherName || typeof entry.teacherName !== 'string' || entry.teacherName.trim() === '') {
    errors.teacherName = 'Teacher is required';
  }

  if (!entry.topicCovered || typeof entry.topicCovered !== 'string' || entry.topicCovered.trim() === '') {
    errors.topicCovered = 'Topic covered is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Create or update diary entries
Adminrouter.post('/daily-diary', async (req, res) => {
  try {
    const { entries } = req.body;
    console.log("HE;;P|",req.body)
    // Validate each entry
    const validationErrors = [];
    for (const [index, entry] of entries.entries()) {
      const { isValid, errors } = validateDiaryEntry(entry);
      if (!isValid) {
        validationErrors.push({
          index,
          errors
        });
      }
      
      // Validate createdBy and teacher_id
      // if (!entry.createdBy) {
      //   validationErrors.push({
      //     index,
      //     errors: { createdBy: 'createdBy is required' }
      //   });
      // }
      // if (!entry.teacher_id) {
      //   validationErrors.push({
      //     index,
      //     errors: { teacher_id: 'teacher_id is required' }
      //   });
      // }
    }

    // if (validationErrors.length > 0) {
    //   return res.json({
    //     success: false,
    //     message: 'Validation failed',
    //     errors: validationErrors
    //   });
    // }

    // Find or create the main diary document
    let diary = await DailyDiary.findOne().sort({ createdAt: -1 });
    if (!diary) {
      diary = new DailyDiary({ entries: [] });
    }

    // Process each entry
    const results = [];
    for (const entry of entries) {
      // Check if entry with same className, subjectName and teacher_id exists
      const existingEntryIndex = diary.entries.findIndex(e => 
        e.className === entry.className && 
        e.subjectName === entry.subjectName &&
        e.teacher_id === entries.teacher_id
      );

      if (existingEntryIndex >= 0) {
        // Update existing entry
        diary.entries[existingEntryIndex] = {
          ...diary.entries[existingEntryIndex],
          ...entry,
          updatedAt: new Date(),
          createdBy: entry.createdBy, // Ensure createdBy is preserved
          teacher_id: entries.teacher_id // Ensure teacher_id is preserved
        };
        results.push(diary.entries[existingEntryIndex]);
      } else {
        // Add new entry with createdBy and teacher_id
        const newEntry = {
          ...entry,
          createdAt: new Date(),
          updatedAt: new Date(),
          teacher_id: entries.teacher_id
        };
        diary.entries.push(newEntry);
        results.push(newEntry);
      }
    }

    // Save the updated diary document
    await diary.save();
    
    res.status(201).json({
      success: true,
      message: 'Diary entries processed successfully',
      data: results
    });
  } catch (error) {
    console.error('Error processing diary entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process diary entries',
      error: error.message
    });
  }
});

// Get all diary entries (with optional filtering)
Adminrouter.get('/daily-diary', async (req, res) => {
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

// Get a single diary entry by ID (now works with entry _id)
Adminrouter.get('/daily-diary/entry/:id', async (req, res) => {
  try {
    const diary = await DailyDiary.findOne({ 'entries._id': req.params.id });
    if (!diary) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found'
      });
    }

    const entry = diary.entries.id(req.params.id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found'
      });
    }
    
    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Error fetching diary entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diary entry',
      error: error.message
    });
  }
});

// Update a diary entry
Adminrouter.put('/daily-diary/entry/:id', async (req, res) => {
  try {
    const { isValid, errors } = validateDiaryEntry(req.body);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    // Find the diary document that contains the entry we want to update
    const diary = await DailyDiary.findOne({ 'entries._id': req.params.id });
    if (!diary) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found'
      });
    }

    // Find the specific entry in the entries array
    const entryIndex = diary.entries.findIndex(entry => entry._id.toString() === req.params.id);
    if (entryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found'
      });
    }

    // Update the entry
    diary.entries[entryIndex] = {
      ...diary.entries[entryIndex].toObject(), // Keep existing fields
      ...req.body, // Apply updates from request body
      _id: diary.entries[entryIndex]._id, // Preserve the original _id
      updatedAt: new Date() // Update the timestamp
    };

    // Mark the entries array as modified
    diary.markModified('entries');

    // Save the parent document
    await diary.save();
    
    res.json({
      success: true,
      message: 'Diary entry updated successfully',
      data: diary.entries[entryIndex]
    });
  } catch (error) {
    console.error('Error updating diary entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update diary entry',
      error: error.message
    });
  }
});

// Delete a diary entry
Adminrouter.delete('/daily-diary/entry/:id', async (req, res) => {
  try {
    // Find the diary document that contains the entry we want to delete
    const diary = await DailyDiary.findOne({ 'entries._id': req.params.id });
    if (!diary) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found'
      });
    }

    // Find the index of the entry to delete
    const entryIndex = diary.entries.findIndex(entry => entry._id.toString() === req.params.id);
    if (entryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found'
      });
    }

    // Remove the entry from the array
    diary.entries.splice(entryIndex, 1);

    // Mark the entries array as modified
    diary.markModified('entries');

    // Save the parent document
    await diary.save();
    
    res.json({
      success: true,
      message: 'Diary entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting diary entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete diary entry',
      error: error.message
    });
  }
});
// Get all diary entries by className
Adminrouter.get('/daily-diary/class/:className', async (req, res) => {
  try {
    const { className } = req.params;

    // Find the latest diary document
    const diary = await DailyDiary.findOne().sort({ createdAt: -1 });

    if (!diary) {
      return res.json({
        success: false,
        message: 'No diary data found'
      });
    }

    // Filter entries by className
    const filteredEntries = diary.entries.filter(entry => entry.className === className);

    if (filteredEntries.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No entries found for class ${className}`
      });
    }

    // Sort by date (newest first)
    filteredEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: filteredEntries
    });
  } catch (error) {
    console.error('Error fetching entries by className:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diary entries by className',
      error: error.message
    });
  }
});
Adminrouter.get('/daily-diary/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Find all diary documents that have entries with the given teacher_id
    const diaries = await DailyDiary.find({
      'entries.teacher_id': teacherId
    });

    if (!diaries || diaries.length === 0) {
      console.log( `No entries found for teacher with ID ${teacherId}`)

      return res.json({
        success: false,
        message: `No entries found for teacher with ID ${teacherId}`,
      });
    }

    // Collect all entries for the teacher from all diary documents
    let allEntries = [];
    diaries.forEach(diary => {
      const teacherEntries = diary.entries.filter(entry => 
        entry.teacher_id === teacherId
      );
      allEntries = allEntries.concat(teacherEntries);
    });

    // Sort all entries by date in descending order
    allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      data: allEntries,
    });
  } catch (error) {
    console.error('Error fetching entries by teacherId:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diary entries by teacherId',
      error: error.message,
    });
  }
});
// -------------------notification-------------------
// POST /notifications - Create a new notification
Adminrouter.post('/notification', async (req, res) => {
  try {
    const { studentId, title, message } = req.body;

    // Validation
    if (!studentId || !title || !message) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Create and save notification
    const newNotification = new Notification({
      studentId,
      title,
      message
    });

    await newNotification.save();

    res.status(201).json({ message: 'Notification created successfully.' });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Server error. Could not create notification.' });
  }
});



// -----------------------exam-name------------------------
// Create exam
Adminrouter.post('/exam-name', async (req, res) => {
  try {
    const { name, title } = req.body;
    const exam = new Examname({ name, title });
    await exam.save();
    res.status(201).json(exam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all exams
Adminrouter.get('/exam-name', async (req, res) => {
  try {
    const exams = await Examname.find().sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single exam
Adminrouter.get('/exam-name/:id', async (req, res) => {
  try {
    const exam = await Examname.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update exam
Adminrouter.put('/exam-name/:id', async (req, res) => {
  try {
    const { name, title } = req.body;
    const updated = await Examname.findByIdAndUpdate(
      req.params.id,
      { name, title },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Exam not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete exam
Adminrouter.delete('/exam-name/:id', async (req, res) => {
  try {
    const deleted = await Examname.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Exam not found' });
    res.json({ message: 'Exam deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
Adminrouter.delete('/exam-name', async (req, res) => {
  try {
    const { confirmation } = req.body;
    

    const result = await Examname.deleteMany({});
    res.json({
      message: `Successfully deleted ${result.deletedCount} exam(s)`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------banner-upload-------------------------------
Adminrouter.get('/all-banners', async (req, res) => {
  try {
    const posts = await ImagePost.find().sort({ createdAt: -1 });
    console.log(posts)
    res.json({data:posts});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// GET single image post
Adminrouter.get('/banner/:id', async (req, res) => {
  try {
    const post = await ImagePost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE image post
Adminrouter.delete('/delete-banner/:id', async (req, res) => {
  try {
    const post = await ImagePost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    // Here you would also delete the actual image file if needed
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// POST new image post
Adminrouter.post('/banner', uploadimage.single('image'), async (req, res) => {
  try {
    const { title, description } = req.body;


    const newPost = new ImagePost({
      title,
      description,
      imageUrl:req.file.filename
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// --------------------notice---------------------------
Adminrouter.post('/notices',uploadimage.single("image"),async (req, res) => {
     try {
            const { title, content, student_ids } = req.body;
            
            // Convert student_ids to array if it's not already
            const studentIdsArray = Array.isArray(student_ids) 
                ? student_ids 
                : student_ids ? [student_ids] : [];
            
            const noticeData = {
                title,
                content,
                student_ids: studentIdsArray,
                priority: req.body.priority || 'medium'
            };

            // If file was uploaded, add the path to the notice data
            if (req.file) {
                noticeData.image = req.file.filename;
            }

            const notice = new Notice(noticeData);
            const savedNotice = await notice.save();
            res.status(201).json(savedNotice);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
});

// GET route - Get all notices
Adminrouter.get('/notices', async (req, res) => {
    try {
        const notices = await Notice.find();
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET route - Get a single notice by ID
Adminrouter.get('/notices/:id', async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }
        res.json(notice);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET route - Get notices by student_id
Adminrouter.get('/notice/:student_id', async (req, res) => {
    try {
        const notices = await Notice.find({ student_ids: req.params.student_id });
        if (notices.length === 0) {
            return res.status(404).json({ message: 'No notices found for this student' });
        }
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// PUT route - Update an entire notice
Adminrouter.put('/notices/:id', async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        notice.title = req.body.title;
        notice.content = req.body.content;
        notice.student_ids = req.body.student_ids;
        notice.student_names = req.body.student_names;
        notice.image = req.body.image;
        notice.priority = req.body.priority;
        notice.is_active = req.body.is_active;

        const updatedNotice = await notice.save();
        res.json(updatedNotice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH route - Partially update a notice
Adminrouter.patch('/notices/:id', async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        // Only update the fields that are passed in the request body
        if (req.body.title != null) notice.title = req.body.title;
        if (req.body.content != null) notice.content = req.body.content;
        if (req.body.student_ids != null) notice.student_ids = req.body.student_ids;
        if (req.body.student_names != null) notice.student_names = req.body.student_names;
        if (req.body.image != null) notice.image = req.body.image;
        if (req.body.priority != null) notice.priority = req.body.priority;
        if (req.body.is_active != null) notice.is_active = req.body.is_active;

        const updatedNotice = await notice.save();
        res.json(updatedNotice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE route - Delete a specific notice by ID
Adminrouter.delete('/delete-notices/:id', async (req, res) => {
    try {
        const notice = await Notice.findByIdAndDelete(req.params.id);
        if (!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        res.json({ message: 'Notice deleted' });
    } catch (err) {
      console.log(err)
        res.status(500).json({ message: err.message });
    }
});

// DELETE route - Delete all notices (use with caution)
Adminrouter.delete('/delete-notice', async (req, res) => {
    try {
        await Notice.deleteMany({});
        res.json({ message: 'All notices deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// Route to get notices by student_id
Adminrouter.get('/notices/student/:student_id', async (req, res) => {
    try {
        const student_id = req.params.student_id;
        console.log(student_id)
        // Validate the student_id is a valid ObjectId
        // if (!mongoose.Types.ObjectId.isValid(student_id)) {
        //     return res.status(400).json({ message: 'Invalid student ID' });
        // }

        // Find notices where the student_ids array contains the provided student_id
        const notices = await Notice.find({
            student_ids: student_id,
            is_active: true // optional: only get active notices
        }).sort({ date_posted: -1 }); // sort by most recent first

        if (notices.length === 0) {
            return res.status(404).json({ message: 'No notices found for this student' });
        }

        res.status(200).json(notices);
    } catch (error) {
        console.error('Error fetching notices:', error);
        res.status(500).json({ message: 'Server error while fetching notices' });
    }
});
module.exports = Adminrouter;