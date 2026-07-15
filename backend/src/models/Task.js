const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  message: {
    type: String,
    required: true
  }
}, { _id: false });

const TaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  inputText: {
    type: String,
    required: true
  },
  operationType: {
    type: String,
    enum: ['uppercase', 'lowercase', 'reverse_string', 'word_count'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed'],
    default: 'pending',
    index: true
  },
  result: {
    type: String
  },
  logs: [LogSchema],
  error: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for user task list dashboard queries sorted by creation date
TaskSchema.index({ userId: 1, createdAt: -1 });

// Middleware to update updatedAt timestamp
TaskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Task', TaskSchema);
