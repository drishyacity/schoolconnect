import { db } from './db';
import { quizzes, questions, quizAttempts, contents } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { InsertQuizAttempt, QuizAttempt } from '@shared/schema';

/**
 * Helper functions for quiz attempts
 */
export async function createQuizAttempt(studentId: number, quizIdOrContentId: number): Promise<QuizAttempt> {
  console.log(`Creating quiz attempt for student ${studentId} and quiz/content ${quizIdOrContentId}`);

  try {
    let quizId: number;

    // First, check if this is a quiz ID directly
    const [directQuiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizIdOrContentId));

    if (directQuiz) {
      // This is already a quiz ID
      console.log(`Found quiz directly with ID ${quizIdOrContentId}`);
      quizId = quizIdOrContentId;
    } else {
      // This might be a content ID, try to find the content
      const [content] = await db.select().from(contents).where(
        and(
          eq(contents.id, quizIdOrContentId),
          eq(contents.contentType, 'quiz' as any)
        )
      );

      if (!content) {
        console.error(`No content found with ID ${quizIdOrContentId}`);
        throw new Error(`No content found with ID ${quizIdOrContentId}`);
      }

      console.log(`Found content with ID ${quizIdOrContentId}, looking for associated quiz`);

      // Find the quiz associated with this content
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.contentId, content.id));

      if (!quiz) {
        console.error(`No quiz found for content ID ${content.id}`);
        throw new Error(`No quiz found for content ID ${content.id}`);
      }

      console.log(`Found quiz with ID ${quiz.id} for content ID ${content.id}`);
      quizId = quiz.id;
    }

    // Check if the student already has an attempt for this quiz
    const existingAttempts = await db.select().from(quizAttempts).where(
      and(
        eq(quizAttempts.studentId, studentId),
        eq(quizAttempts.quizId, quizId)
      )
    );

    console.log(`Found ${existingAttempts.length} existing attempts for student ${studentId} and quiz ${quizId}`);

    // Check if there's a completed attempt
    const completedAttempt = existingAttempts.find(attempt => attempt.completedAt !== null);
    if (completedAttempt) {
      console.error(`Student ${studentId} already has a completed attempt (${completedAttempt.id}) for quiz ${quizId}`);
      throw new Error(`You have already completed this quiz. You cannot attempt it again.`);
    }

    // Check if there's an incomplete attempt
    const incompleteAttempt = existingAttempts.find(attempt => attempt.completedAt === null);
    if (incompleteAttempt) {
      console.log(`Student ${studentId} already has an incomplete attempt (${incompleteAttempt.id}) for quiz ${quizId}`);
      console.log("Returning existing incomplete attempt instead of creating a new one");
      return incompleteAttempt;
    }

    // Create the attempt with the correct quiz ID
    const [result] = await db.insert(quizAttempts).values({
      quizId: quizId,
      studentId: studentId,
      startedAt: new Date(),
      answers: {}
    }).returning();

    console.log(`Quiz attempt created successfully with ID ${result.id}`);
    return result;
  } catch (error) {
    console.error(`Error creating quiz attempt:`, error);
    throw error;
  }
}

/**
 * Update a quiz attempt with answers and calculate the score
 */
export async function updateQuizAttempt(attemptId: number, studentId: number, answers: any): Promise<QuizAttempt & { totalPossibleScore: number, percentage: number }> {
  console.log(`Updating quiz attempt ${attemptId} for student ${studentId}`);
  console.log(`Raw answers:`, JSON.stringify(answers));

  try {
    // Get the quiz attempt to make sure it exists and belongs to this student
    const [quizAttempt] = await db.select().from(quizAttempts).where(
      and(
        eq(quizAttempts.id, attemptId),
        eq(quizAttempts.studentId, studentId)
      )
    );

    if (!quizAttempt) {
      console.error(`Quiz attempt with ID ${attemptId} not found or doesn't belong to student ${studentId}`);
      throw new Error(`Quiz attempt not found`);
    }

    // Get the quiz ID from the attempt
    const quizId = quizAttempt.quizId;
    console.log(`Found quiz attempt for quiz ID ${quizId}`);

    // Get the questions for this quiz
    const questionsList = await db.select().from(questions).where(eq(questions.quizId, quizId));
    console.log(`Found ${questionsList.length} questions for quiz ${quizId}`);

    // Calculate score
    let score = 0;
    let totalPossibleScore = 0;

    // Normalize the answers to a standard format
    const normalizedAnswers: Record<string, { selectedOptionId: string }> = {};

    // Process each answer to ensure it's in the correct format
    Object.entries(answers).forEach(([questionId, answer]) => {
      if (answer === null || answer === undefined) {
        return;
      }

      let selectedOptionId: string | null = null;

      if (typeof answer === 'object') {
        if (answer.selectedOptionId !== undefined) {
          selectedOptionId = String(answer.selectedOptionId);
        } else {
          // Try to find any property that might be the selected option ID
          const values = Object.values(answer).filter(v => v !== null && v !== undefined);
          if (values.length > 0) {
            selectedOptionId = String(values[0]);
          }
        }
      } else if (typeof answer === 'string' || typeof answer === 'number') {
        selectedOptionId = String(answer);
      }

      if (selectedOptionId) {
        normalizedAnswers[questionId] = { selectedOptionId };
      }
    });

    console.log(`Normalized answers:`, normalizedAnswers);

    // Process each question
    for (const question of questionsList) {
      totalPossibleScore += question.points;

      const questionId = String(question.id);
      const studentAnswer = normalizedAnswers[questionId];

      if (!studentAnswer) {
        console.log(`No answer provided for question ${questionId}`);
        continue;
      }

      const selectedOptionId = studentAnswer.selectedOptionId;
      console.log(`Student selected option ${selectedOptionId} for question ${questionId}`);

      // Process the options
      let options = [];

      // Parse options if they're stored as a string
      if (typeof question.options === 'string') {
        try {
          options = JSON.parse(question.options);
        } catch (e) {
          console.error(`Failed to parse options for question ${questionId}:`, e);
          continue;
        }
      } else if (Array.isArray(question.options)) {
        options = question.options;
      } else {
        console.error(`Invalid options format for question ${questionId}:`, question.options);
        continue;
      }

      // Find the correct option
      let correctOption = null;

      for (const option of options) {
        console.log(`Checking option:`, option);

        // Check various formats of isCorrect
        const isCorrect =
          option.isCorrect === true ||
          option.isCorrect === 'true' ||
          option.isCorrect === 1 ||
          option.isCorrect === '1' ||
          option.is_correct === true ||
          option.is_correct === 'true' ||
          option.is_correct === 1 ||
          option.is_correct === '1';

        if (isCorrect) {
          correctOption = option;
          break;
        }
      }

      if (!correctOption) {
        console.log(`No correct option found for question ${questionId}`);
        continue;
      }

      console.log(`Correct option for question ${questionId}:`, correctOption);

      // Compare the selected option with the correct option
      // The issue is that in the database, the options don't have explicit IDs
      // Instead, the index in the array is used as the ID (1-based)
      // So we need to compare the selected option ID with the index of the correct option

      // Find the index of the correct option in the array (0-based)
      const correctOptionIndex = options.findIndex(opt =>
        opt.isCorrect === true ||
        opt.isCorrect === 'true' ||
        opt.isCorrect === 1 ||
        opt.isCorrect === '1' ||
        opt.is_correct === true ||
        opt.is_correct === 'true' ||
        opt.is_correct === 1 ||
        opt.is_correct === '1'
      );

      // Convert to 1-based index to match the client-side IDs
      const correctOptionId = correctOptionIndex !== -1 ? String(correctOptionIndex + 1) : null;

      console.log(`Correct option index: ${correctOptionIndex}, Correct option ID: ${correctOptionId}`);
      console.log(`Selected option ID: ${selectedOptionId}, Comparing with correct option ID: ${correctOptionId}`);

      if (correctOptionId && selectedOptionId === correctOptionId) {
        console.log(`Correct answer for question ${questionId}! Adding ${question.points} points`);
        score += question.points;
      } else {
        console.log(`Incorrect answer for question ${questionId}`);
      }
    }

    console.log(`Final score: ${score}/${totalPossibleScore}`);

    // Update the attempt with the score and answers
    const [updatedAttempt] = await db.update(quizAttempts)
      .set({
        completedAt: new Date(),
        score,
        answers: normalizedAnswers
      })
      .where(eq(quizAttempts.id, attemptId))
      .returning();

    console.log(`Quiz attempt ${attemptId} updated successfully`);

    return {
      ...updatedAttempt,
      totalPossibleScore,
      percentage: totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0,
    };
  } catch (error) {
    console.error(`Error updating quiz attempt:`, error);
    throw error;
  }
}

/**
 * Save quiz progress without completing the quiz
 */
export async function saveQuizProgress(attemptId: number, studentId: number, answers: any): Promise<QuizAttempt> {
  console.log(`Saving progress for quiz attempt ${attemptId} for student ${studentId}`);
  console.log(`Raw answers:`, JSON.stringify(answers));

  try {
    // Get the quiz attempt to make sure it exists and belongs to this student
    const [quizAttempt] = await db.select().from(quizAttempts).where(
      and(
        eq(quizAttempts.id, attemptId),
        eq(quizAttempts.studentId, studentId)
      )
    );

    if (!quizAttempt) {
      console.error(`Quiz attempt with ID ${attemptId} not found or doesn't belong to student ${studentId}`);
      throw new Error(`Quiz attempt not found`);
    }

    // Normalize the answers to a standard format
    const normalizedAnswers: Record<string, { selectedOptionId: string }> = {};

    // Process each answer to ensure it's in the correct format
    Object.entries(answers).forEach(([questionId, answer]) => {
      if (answer === null || answer === undefined) {
        return;
      }

      let selectedOptionId: string | null = null;

      if (typeof answer === 'object') {
        if (answer.selectedOptionId !== undefined) {
          selectedOptionId = String(answer.selectedOptionId);
        } else {
          // Try to find any property that might be the selected option ID
          const values = Object.values(answer).filter(v => v !== null && v !== undefined);
          if (values.length > 0) {
            selectedOptionId = String(values[0]);
          }
        }
      } else if (typeof answer === 'string' || typeof answer === 'number') {
        selectedOptionId = String(answer);
      }

      if (selectedOptionId) {
        normalizedAnswers[questionId] = { selectedOptionId };
      }
    });

    console.log(`Normalized answers for progress save:`, normalizedAnswers);

    // Update the attempt with just the answers, don't mark as completed
    const [updatedAttempt] = await db.update(quizAttempts)
      .set({
        answers: normalizedAnswers
      })
      .where(eq(quizAttempts.id, attemptId))
      .returning();

    console.log(`Quiz attempt ${attemptId} progress saved successfully`);
    return updatedAttempt;
  } catch (error) {
    console.error(`Error saving quiz progress:`, error);
    throw error;
  }
}