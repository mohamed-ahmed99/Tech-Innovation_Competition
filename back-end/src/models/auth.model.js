import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            trim: true,
            minlength: 3,
            maxlength: 30,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        phone: {
            type: String,
            unique: true,
            sparse: true, // مهم لو اختياري 🔥
            trim: true,
            validate: {
                validator: function (v) {
                    return /^\+?[1-9]\d{7,14}$/.test(v); // E.164 format
                },
                message: "Invalid phone number format",
            },
        },

        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },

        role: {
            type: String,
            enum: ["user", "admin", "moderator"],
            default: "user",
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        isPhoneVerified: {
            type: Boolean,
            default: false,
        },

        phoneVerificationCode: String,
        phoneVerificationExpires: Date,

        loginAttempts: {
            type: Number,
            default: 0,
        },

        lockUntil: Date,

        passwordChangedAt: Date,
        passwordResetToken: String,
        passwordResetExpires: Date,

        refreshToken: String,
        lastLogin: Date,
    },
    { timestamps: true }
);

// 🔐 Hash password
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// 🔑 Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
