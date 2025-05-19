import { ActivityLog } from '../models/activityLog.model.js';
import { Admin } from '../models/admin.model.js';
import { Class } from '../models/class.model.js';
import { Parent } from '../models/parent.model.js';
import { Student } from '../models/student.model.js';
import { Teacher } from '../models/teacher.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from 'jsonwebtoken'

// GenerateAccessAndRefreshToken
const generateAccessAndRefreshToken = async (userId, userModel) => {
    // Dynamically find the user model (Admin, Teacher, or Student) based on the passed model
    const user = await userModel.findById(userId);

    // Check if user exists
    if (!user) {
        throw new ApiError(400, 'User not found');
    }

    // Generate access and refresh tokens based on the user instance methods
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save the refresh token in the user document (do not validate before save)
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
}

// Register-Controllers
export const registerAdmin = asyncHandler(async (req, res) => {
    const { instituteName, email, password } = req.body;
    const logoLocalPath = req.file?.path || req.file.buffer;
    // Check if any of the required fields are empty
    if ([instituteName, email, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, 'All fields are required');
    }

    if (!logoLocalPath) {
        throw new ApiError(400, "Please upload a logo");
    }
    // Check if the email is valid
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, 'Invalid email format');
    }

    // Check if the password is at least 8 characters long and has a mix of characters
    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(password)) {
        throw new ApiError(400, 'Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters');
    }

    // Check if the user already exists (by SchoolOrCollegeName or email)
    const existedAdmin = await Admin.findOne({
        $or: [{ instituteName }, { email }]
    });


    if (existedAdmin) {
        if (existedAdmin.email === email) {
            throw new ApiError(400, 'Email already registered');
        } else {
            throw new ApiError(400, 'Institute Name already taken');
        }
    }

    // Upload the image to Cloudinary
    const logo = await uploadOnCloudinary(logoLocalPath);

    // If upload fails, return a suitable error
    if (!logo) {
        throw new ApiError(500, "Failed to upload logo to Cloudinary");
    }

    // Create a new admin user
    const admin = await Admin.create({
        instituteName,
        email,
        password,
        logo: logo.url, // Save the Cloudinary URL
        role: 'admin',
    });

    const registeredAdmin = admin.toObject();
    // If user creation failed, throw an error
    if (!registeredAdmin) {
        throw new ApiError(500, 'Something went wrong while registering the Admin');
    }

    // Remove sensitive data before sending the response
    delete registeredAdmin.password;
    delete registeredAdmin.refreshToken;

    // Return successful registration response
    return res.status(200).json(
        new ApiResponse(200, registeredAdmin, 'Admin registered successfully')
    );
});

export const registerTeacher = asyncHandler(async (req, res) => {
    const id = req.user._id;

    const {
        name, teacherId, email, password,
        department, qualifications,
        phoneNumber, dateOfBirth, address, emergencyContact, bloodGroup,
        nationality
    } = req.body;

    const logoLocalPath = req.file?.path || req.file.buffer;

    // Check if required fields (from frontend validation) are missing
    if ([name, teacherId, email, password, department, phoneNumber,
        dateOfBirth, address, nationality]
        .some(field => field?.trim() === "") || !qualifications) {
        throw new ApiError(400, 'Please fill required Fields');
    }

    if (!logoLocalPath) {
        throw new ApiError(400, "Please upload a logo");
    }

    // Check if the email is valid
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, 'Invalid email format');
    }

    // Check if the password is at least 8 characters long and has a mix of characters
    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(password)) {
        throw new ApiError(400, 'Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters');
    }

    // Check if the user already exists (by teacherId or email)
    const existedTeacher = await Teacher.findOne({ $or: [{ teacherId }, { email }], instituteId: id });

    if (existedTeacher) {
        if (existedTeacher.email === email) {
            throw new ApiError(400, 'Email already registered');
        } else {
            throw new ApiError(400, 'TeacherId already taken');
        }
    }

    // Upload the image to Cloudinary
    const logo = await uploadOnCloudinary(logoLocalPath);

    // If upload fails, return a suitable error
    if (!logo) {
        throw new ApiError(500, "Failed to upload logo to Cloudinary");
    }

    const teacherQualifications = Array.isArray(qualifications) ? qualifications : [qualifications];

    // Create a new Teacher 
    const teacher = await Teacher.create({
        name,
        teacherId,
        email,
        password,
        role: 'teacher',
        logo: logo.url, // Save the Cloudinary URL
        department,
        qualifications: teacherQualifications,
        phoneNumber,
        dateOfBirth,
        address,
        emergencyContact,
        bloodGroup,
        nationality,
        instituteId: id
    });

    const registeredTeacher = teacher.toObject();

    // If user creation failed, throw an error
    if (!registeredTeacher) {
        throw new ApiError(500, 'Something went wrong while registering the Teacher');
    }

    // Log the activity
    await ActivityLog.create({
        instituteId: id,
        action: `Added teacher: ${name}`,
        details: `Teacher ID: ${teacherId}`
    });

    // Remove sensitive data before sending the response
    delete registeredTeacher.password;
    delete registeredTeacher.refreshToken;

    // Return successful registration response
    return res.status(200).json(
        new ApiResponse(200, registeredTeacher, 'Teacher registered successfully')
    );
});

export const registerParent = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const { name, email, phoneNumber, password } = req.body;

    if ([name, email, phoneNumber, password].some(field => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Invalid email format");
    }

    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(password)) {
        throw new ApiError(400, 'Password must be at least 8 characters and contain a mix of letters, numbers, and special characters');
    }

    const existingParent = await Parent.findOne({ email, instituteId: id });
    if (existingParent) {
        throw new ApiError(409, "Parent with this email already exists in this institute");
    }


    const newParent = await Parent.create({
        name,
        email,
        phoneNumber,
        password,
        role: 'parent',
        instituteId: id
    });

    if (!newParent) {
        throw new ApiError(500, "Failed to create parent");
    }

    const createdParent = newParent.toObject();
    // Log the activity
    await ActivityLog.create({
        instituteId: id,
        action: `Added Parent: ${name}`,
        details: `Parent Email: ${email}`
    });

    delete createdParent.password;

    return res.status(201).json(
        new ApiResponse(201, createdParent, "Parent registered successfully")
    );
});

export const registerStudent = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const {
        name, rollNumber, email, password,
        guardianName, guardianEmail,
        studentClass, section, admissionYear, dateOfBirth,
        address, emergencyContact, bloodGroup, nationality
    } = req.body;

    const logoLocalPath = req.file?.path || req.file.buffer;

    if ([name, rollNumber, email, password, section, String(admissionYear),
        dateOfBirth, address, emergencyContact, nationality,
        guardianName, guardianEmail]
        .some(field => field?.trim() === "") || !studentClass) {
        throw new ApiError(400, 'Fill required fields');
    }

    if (!logoLocalPath) {
        throw new ApiError(400, "Please upload a logo");
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email) || !emailRegex.test(guardianEmail)) {
        throw new ApiError(400, 'Invalid email format for student or guardian');
    }

    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(password)) {
        throw new ApiError(400, 'Student password must be at least 8 characters and contain a mix of letters, numbers, and special characters');
    }

    const existedStudent = await Student.findOne({ rollNumber, email, instituteId: id });
    if (existedStudent) {
        if (existedStudent.email === email) {
            throw new ApiError(400, 'Email already registered');
        } else {
            throw new ApiError(400, 'Roll number already taken');
        }
    }

    const foundClass = await Class.findOne({ classTitle: studentClass, section, instituteId: id });
    if (!foundClass) {
        throw new ApiError(404, `Class with title(${studentClass}) or section(${section}) not found`);
    }


    // Upload the image to Cloudinary
    const logo = await uploadOnCloudinary(logoLocalPath);

    // If upload fails, return a suitable error
    if (!logo) {
        throw new ApiError(500, "Failed to upload logo to Cloudinary");
    }

    // ✅ Check if Parent already exists
    const matchedParent = await Parent.findOne({
        name: guardianName.trim().toLowerCase(),
        email: guardianEmail,
        instituteId: id
    });

    if (!matchedParent) {
        throw new ApiError(404, 'Parent not found. Please register the parent first.');
    }

    const student = await Student.create({
        name,
        rollNumber,
        email,
        password,
        role: 'student',
        logo: logo?.url, // You can add cloudinary upload again later if needed
        guardian: matchedParent._id, // ✅ Reference parent
        studentClass: foundClass.classTitle,
        section: foundClass.section,
        admissionYear: Number(admissionYear),
        dateOfBirth,
        address,
        emergencyContact,
        bloodGroup,
        nationality,
        instituteId: id
    });

    const registeredStudent = student.toObject();

    if (!registeredStudent) {
        throw new ApiError(500, 'Something went wrong while registering the Student');
    }

    const alreadyInClass = foundClass.students.some(sid => sid.equals(student._id));
    if (alreadyInClass) {
        throw new ApiError(400, 'Student already in class');
    } else {
        foundClass.students.push(student._id);
        matchedParent.childrens.push(student._id)
        await foundClass.save({ validateBeforeSave: true });
        await matchedParent.save({ validateBeforeSave: true });
    }

    await ActivityLog.create({
        instituteId: id,
        action: `Added Student: ${name}`,
        details: `Student RollNumber: ${rollNumber}`
    });

    delete registeredStudent.password;
    delete registeredStudent.refreshToken;

    return res.status(200).json(
        new ApiResponse(200, registeredStudent, 'Student registered successfully')
    );
});



// Login-Controllers
export const loginAdmin = asyncHandler(async (req, res) => {
    const { instituteNameOrEmail, password } = req.body;
    if (!instituteNameOrEmail) {
        throw new ApiError(400, 'Institute Name or Email is required');
    }

    if (!password) {
        throw new ApiError(400, 'Password is required');
    }

    if (password.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters');
    }

    const admin = await Admin.findOne({
        $or: [
            { instituteName: instituteNameOrEmail },
            { email: instituteNameOrEmail }]
    });

    if (!admin) {
        throw new ApiError(400, 'Admin does not exist');
    }

    // Check if the role is 'admin'
    if (admin.role !== 'admin') {
        throw new ApiError(403, 'Access denied. Not an admin account.');
    }

    const isPasswordCorrect = await admin.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        throw new ApiError(400, 'Password is wrong');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(admin._id, Admin);

    const loggedInUser = admin.toObject();
    delete loggedInUser.password;
    delete loggedInUser.refreshToken;

    const options = {
        httpOnly: true,
        secure: true,       // Required for 'None' to work
        sameSite: 'None',   // Allow cross-site cookies (required for frontend ↔ backend)
        path: '/',
    };

    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    admin: loggedInUser, accessToken, refreshToken
                },
                'Admin LoggedIn Successfully')
        );
});

export const loginTeacher = asyncHandler(async (req, res) => {
    const { teacherIdOrEmail, password } = req.body;

    if (!teacherIdOrEmail) {
        throw new ApiError(400, 'TeacherID or email is required');
    }

    if (!password) {
        throw new ApiError(400, 'Password is required');
    }


    if (password.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters');
    }

    const teacher = await Teacher.findOne({
        $or: [
            { teacherId: teacherIdOrEmail },
            { email: teacherIdOrEmail }
        ]
    }).populate('classTeacherOf', 'classTitle section')


    if (!teacher) {
        throw new ApiError(400, 'Teacher does not exist');
    }

    // Check if the role is 'admin'
    if (teacher.role !== 'teacher') {
        throw new ApiError(403, 'Access denied. Not an Teacher account.');
    }

    const isPasswordCorrect = await teacher.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        throw new ApiError(400, 'Password is wrong');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(teacher._id, Teacher);

    const loggedInUser = teacher.toObject();
    delete loggedInUser.password;
    delete loggedInUser.refreshToken;

    const options = {
        httpOnly: true,
        secure: true,       // Required for 'None' to work
        sameSite: 'None',   // Allow cross-site cookies (required for frontend ↔ backend)
        path: '/',
    };

    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    teacher: loggedInUser, accessToken, refreshToken
                },
                'Teacher LoggedIn Successfully')
        );
});

export const loginStudent = asyncHandler(async (req, res) => {
    const { rollNumberOrEmail, password } = req.body;

    if (!rollNumberOrEmail) {
        throw new ApiError(400, 'RollNumber or email is required');
    }

    if (!password) {
        throw new ApiError(400, 'Password is required');
    }

    if (password.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters');
    }

    const student = await Student.findOne({
        $or: [
            { rollNumber: rollNumberOrEmail },
            { email: rollNumberOrEmail }
        ]
    })
        .populate('guardian', 'name email')
        .populate('instituteId', 'instituteName email')

    if (!student) {
        throw new ApiError(400, 'Student does not exist');
    }

    // Check if the role is 'admin'
    if (student.role !== 'student') {
        throw new ApiError(403, 'Access denied. Not an Student account.');
    }

    const isPasswordCorrect = await student.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        throw new ApiError(400, 'Password is wrong');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(student._id, Student);

    const loggedInUser = student.toObject();
    delete loggedInUser.password;
    delete loggedInUser.refreshToken;

    const options = {
        httpOnly: true,
        secure: true,       // Required for 'None' to work
        sameSite: 'None',   // Allow cross-site cookies (required for frontend ↔ backend)
        path: '/',
    };

    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    student: loggedInUser, accessToken, refreshToken
                },
                'Student LoggedIn Successfully')
        );
});

export const loginParent = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, 'Email is required');
    }

    if (!password) {
        throw new ApiError(400, 'Password is required');
    }

    if (password.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters');
    }

    const parent = await Parent.findOne({ email })
        .populate("childrens", 'name email logo rollNumber studentClass section')
        ;

    if (!parent) {
        throw new ApiError(400, 'Parent does not exist');
    }

    const isPasswordCorrect = await parent.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(400, 'Password is incorrect');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(parent._id, Parent);

    const loggedInParent = parent.toObject();
    delete loggedInParent.password;
    delete loggedInParent.refreshToken;

    const options = {
        httpOnly: true,
        secure: true,       // Required for 'None' to work
        sameSite: 'None',   // Allow cross-site cookies (required for frontend ↔ backend)
        path: '/',
    };

    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { parent: loggedInParent, accessToken, refreshToken },
                'Parent Logged In Successfully'
            )
        );
});


// Others
export const logout = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(400, "Refresh token missing");
    }

    // Verify refresh token
    let decoded;
    try {
        decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token");
    }

    let user;

    // Check the role and find the user accordingly using switch
    switch (decoded.role) {
        case 'admin':
            user = await Admin.findByIdAndUpdate(
                decoded._id,
                { $unset: { refreshToken: 1 } },
                { new: true }
            );
            break;
        case 'student':
            user = await Student.findByIdAndUpdate(
                decoded._id,
                { $unset: { refreshToken: 1 } },
                { new: true }
            );
            break;
        case 'teacher':
            user = await Teacher.findByIdAndUpdate(
                decoded._id,
                { $unset: { refreshToken: 1 } },
                { new: true }
            );
            break;
        default:
            throw new ApiError(400, 'Invalid role');
    }

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: "Strict"
    };

    // Clear cookies
    res
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .status(200)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export const refreshAuthTokens = asyncHandler(async (req, res) => {
    // Retrieve the refresh token from cookies or body
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    // If no refresh token is provided, return unauthorized error
    if (!incomingRefreshToken) {
        throw new ApiError(401, 'Unauthorized request: No refresh token provided');
    }

    let decodedToken;
    try {
        // Verify the refresh token
        decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        // Handle expired or invalid refresh token error
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Refresh token has expired');
        }
        // Other token errors (e.g., malformed token, invalid signature)
        throw new ApiError(401, 'Invalid refresh token');
    }

    // Switch to determine the user collection based on role (Admin, Teacher, Student)
    let user;
    let Model;
    switch (decodedToken.role) {
        case 'admin':
            Model = Admin; // Admin model
            break;
        case 'teacher':
            Model = Teacher; // Teacher model
            break;
        case 'student':
            Model = Student; // Student model
            break;
        case 'parent':
            Model = Parent; // Student model
            break;
        default:
            throw new ApiError(401, 'Invalid role in token');
    }

    // Fetch the user from the model
    user = await Model.findById(decodedToken._id);

    if (!user) {
        throw new ApiError(401, 'User not found');
    }

    // If the refresh token does not match the one in the database, it's invalid
    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, 'Refresh token is expired or used');
    }

    // Generate new access and refresh tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id, Model);

    // Set the cookie options
    const cookieOptions = {
        httpOnly: true,         // Protects against XSS
        secure: true,           // Ensures cookie is sent only over HTTPS
        sameSite: 'Strict',     // Prevents CSRF attacks
        path: '/',             // Cookie is available for the entire app
    };

    // Send the new tokens back in the response and set them as cookies
    return res
        .status(200)
        .cookie('accessToken', newAccessToken, cookieOptions)
        .cookie('refreshToken', newRefreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { newAccessToken, newRefreshToken },
                'Tokens successfully refreshed'
            )
        );
});

export const verifySession = asyncHandler(async (req, res) => {
    const accessToken = req.cookies?.accessToken;
    if (!accessToken) {
        throw new ApiError(401, 'No access token provided');
    }

    try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        // Verify the token hasn't been revoked (optional but recommended)
        let user;
        switch (decoded.role) {
            case 'admin':
                user = await Admin.findById(decoded._id);
                break;
            case 'teacher':
                user = await Teacher.findById(decoded._id);
                break;
            case 'student':
                user = await Student.findById(decoded._id);
                break;
            case 'parent':
                user = await Parent.findById(decoded._id);
                break;
            default:
                throw new ApiError(401, 'Invalid role');
        }
        if (!user) {
            throw new ApiError(401, 'User not found');
        }

        return res.status(200).json(new ApiResponse(200, {}, 'Session is valid'));
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Token expired');
        }
        throw new ApiError(401, 'Invalid token');
    }
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user;
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                'Current User fetched Successfully'
            )
        )

});

export const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // Input validation
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, 'Both old and new password are required');
    }

    const { _id, role } = req.user;

    let Model;

    switch (role) {
        case 'admin':
            Model = Admin;
            break;
        case 'teacher':
            Model = Teacher;
            break;
        case 'student':
            Model = Student;
            break;
        default:
            throw new ApiError(400, 'Invalid role');
    }

    // Fetch user with password field
    const user = await Model.findById(_id)

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(401, 'Incorrect old password');
    }

    // Check if the password is at least 8 characters long and has a mix of characters
    if (newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(newPassword)) {
        throw new ApiError(400, 'Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters');
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: 'Password changed successfully' });
});