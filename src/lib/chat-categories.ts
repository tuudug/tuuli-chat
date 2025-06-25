import {
  CalculatorIcon, // Math
  AtomIcon, // Physics
  FlaskConicalIcon, // Chemistry
  CodeIcon, // Code
} from "lucide-react";

// Define categories and example questions
export const categories = {
  Math: {
    icon: CalculatorIcon,
    questions: [
      "Explain the Pythagorean theorem.",
      "What is the derivative of x^2?",
      "Solve for x: 2x + 5 = 15",
      "What are prime numbers?",
    ],
  },
  Physics: {
    icon: AtomIcon,
    questions: [
      "What is Newton's second law of motion?",
      "Explain the theory of relativity.",
      "What is quantum entanglement?",
      "How does gravity work?",
    ],
  },
  Chemistry: {
    icon: FlaskConicalIcon,
    questions: [
      "What is the chemical formula for water?",
      "Explain the difference between ionic and covalent bonds.",
      "What is pH?",
      "Balance the chemical equation: H2 + O2 -> H2O",
    ],
  },
  Code: {
    icon: CodeIcon,
    questions: [
      "Write a Python function to reverse a string.",
      "Explain what an API is.",
      "What is the difference between let and const in JavaScript?",
      "How does CSS Flexbox work?",
    ],
  },
};

export type CategoryName = keyof typeof categories;
