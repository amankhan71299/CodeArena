import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    problem: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Problem', 
      required: true 
    },
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest',
      default: null
    },
    language: { 
      type: String, 
      required: true 
      // Validation against problem's supportedLanguages is done in controller
    },
    sourceCode: { 
      type: String, 
      required: true,
      maxlength: [50000, 'Source code exceeds maximum allowed size (50KB)']
    },
    status: { 
      type: String, 
      default: 'QUEUED',
      enum: [
        'QUEUED', 
        'RUNNING', 
        'ACCEPTED', 
        'WRONG_ANSWER', 
        'TIME_LIMIT_EXCEEDED', 
        'MEMORY_LIMIT_EXCEEDED', 
        'RUNTIME_ERROR', 
        'COMPILATION_ERROR', 
        'SYSTEM_ERROR'
      ] 
    },
    submittedAt: { 
      type: Date, 
      default: Date.now 
    },
    executionTime: { 
      type: Number, 
      default: null 
    },
    memoryUsed: { 
      type: Number, 
      default: null 
    },
    testCasesPassed: { 
      type: Number, 
      default: null 
    },
    totalTestCases: { 
      type: Number, 
      default: null 
    },
    errorMessage: { 
      type: String, 
      default: null 
    }
  },
  { timestamps: true }
);

// Add an index to efficiently query submissions by problem and user
SubmissionSchema.index({ problem: 1, user: 1, submittedAt: -1 });
SubmissionSchema.index({ contest: 1, problem: 1, user: 1 });

export default mongoose.model('Submission', SubmissionSchema);
