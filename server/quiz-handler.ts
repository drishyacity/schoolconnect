import { db } from './db';
import { quizzes, questions, contents } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { pool } from './db';

/**
 * Get a quiz by ID (either quiz ID or content ID)
 */
export async function getQuizById(id: number): Promise<any> {
  console.log(`Getting quiz with ID: ${id}`);

  try {
    // First, check if this is a content ID
    console.log(`Checking if ${id} is a content ID...`);
    let content = null;
    const contentResults = await db.select().from(contents).where(
      and(
        eq(contents.id, id),
        eq(contents.contentType, 'quiz' as any)
      )
    );

    if (contentResults.length > 0) {
      content = contentResults[0];
    }

    let quiz;

    if (content) {
      console.log(`Found content with ID ${id}, looking for associated quiz`);
      const quizResults = await db.select().from(quizzes).where(eq(quizzes.contentId, content.id));
      if (quizResults.length > 0) {
        quiz = quizResults[0];
        console.log(`Found quiz with ID ${quiz.id} for content ID ${content.id}`);
      } else {
        console.log(`No quiz found for content ID ${content.id}`);
        return null;
      }
    } else {
      // If not a content ID, try to find the quiz directly by its ID
      console.log(`Content not found with ID ${id}, checking if it's a quiz ID`);
      [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));

      if (quiz) {
        console.log(`Found quiz with ID ${id}, looking for associated content`);
        const contentResults = await db.select().from(contents).where(eq(contents.id, quiz.contentId));
        const contentItem = contentResults[0];
        if (!contentItem) {
          console.log(`No content found for quiz ID ${id}`);
          return null;
        }
        content = contentItem; // Assign to the existing content variable
      } else {
        console.log(`No quiz found with ID ${id}`);
        // Let's check all quizzes to help debug
        const allQuizzes = await db.select().from(quizzes);
        console.log(`Available quizzes: ${allQuizzes.map(q => q.id).join(', ')}`);
        return null;
      }
    }

    // Get the questions for this quiz
    const questionsList = await db.select().from(questions).where(eq(questions.quizId, quiz.id));
    console.log(`Found ${questionsList.length} questions for quiz ${quiz.id}`);

    // Process questions to ensure options are properly formatted
    const processedQuestions = questionsList.map(question => {
      console.log(`Processing question ${question.id}, options:`, question.options);

      // Make sure options is an array
      let options = question.options;

      // If options is a string, try to parse it as JSON
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
          console.log(`Parsed options for question ${question.id}:`, options);
        } catch (e) {
          console.error(`Failed to parse options for question ${question.id}:`, e);
          // If parsing fails, create a default set of options
          options = [
            { id: 1, text: "Option A (Sample)", isCorrect: true },
            { id: 2, text: "Option B (Sample)", isCorrect: false },
            { id: 3, text: "Option C (Sample)", isCorrect: false },
            { id: 4, text: "Option D (Sample)", isCorrect: false }
          ];
        }
      }

      // If options is still not an array or is empty, create default options
      if (!Array.isArray(options) || options.length === 0) {
        console.log(`Creating default options for question ${question.id}`);
        options = [
          { id: 1, text: "Option A (Sample)", isCorrect: true },
          { id: 2, text: "Option B (Sample)", isCorrect: false },
          { id: 3, text: "Option C (Sample)", isCorrect: false },
          { id: 4, text: "Option D (Sample)", isCorrect: false }
        ];
      }

      // Ensure each option has an id property and normalize isCorrect to boolean
      options = options.map((opt, index) => {
        // Normalize isCorrect to boolean
        let isCorrectValue = false;

        // Handle different formats of isCorrect
        if (opt.isCorrect === true || opt.isCorrect === 'true' || opt.isCorrect === 1 || opt.isCorrect === '1') {
          isCorrectValue = true;
        }

        // Also check for is_correct (snake_case)
        if (opt.is_correct === true || opt.is_correct === 'true' || opt.is_correct === 1 || opt.is_correct === '1') {
          isCorrectValue = true;
        }

        return {
          id: opt.id || index + 1,
          text: opt.text || `Option ${index + 1}`,
          isCorrect: isCorrectValue
        };
      });

      // Make sure at least one option is marked as correct
      const hasCorrectOption = options.some(opt => opt.isCorrect === true);
      if (!hasCorrectOption && options.length > 0) {
        console.log(`No correct option found for question ${question.id}, marking first option as correct`);
        options[0].isCorrect = true;
      }

      // Convert question properties from snake_case to camelCase if needed
      const processedQuestion = {
        id: question.id,
        quizId: question.quizId || question.quiz_id,
        text: question.text,
        options: options,
        points: question.points,
        order: question.order
      };

      console.log(`Processed question ${question.id}:`, processedQuestion);
      return processedQuestion;
    });

    // Get class and subject details
    const client = await pool.connect();
    try {
      // Get class details
      const classResult = content.classId ?
        await client.query(`SELECT * FROM classes WHERE id = $1`, [content.classId]) :
        { rows: [] };

      // Get subject details
      const subjectResult = content.subjectId ?
        await client.query(`SELECT * FROM subjects WHERE id = $1`, [content.subjectId]) :
        { rows: [] };

      // Get author details
      const authorResult = content.authorId ?
        await client.query(`SELECT id, name, email, role FROM users WHERE id = $1`, [content.authorId]) :
        { rows: [] };

      // Create a complete quiz object
      // Handle both camelCase and snake_case field names
      const completeQuiz = {
        id: quiz.id,
        contentId: content.id,
        title: content.title,
        description: content.description,
        timeLimit: quiz.timeLimit || quiz.time_limit,
        passingScore: quiz.passingScore || quiz.passing_score,
        totalPoints: quiz.totalPoints || quiz.total_points,
        status: content.status,
        createdAt: content.createdAt || content.created_at,
        dueDate: content.dueDate || content.due_date,
        classId: content.classId || content.class_id,
        subjectId: content.subjectId || content.subject_id,
        authorId: content.authorId || content.author_id,
        class: classResult.rows[0] || null,
        subject: subjectResult.rows[0] || null,
        author: authorResult.rows[0] || null,
        questions: processedQuestions
      };

      // Debug log the complete quiz object
      console.log("Complete quiz object created:", {
        id: completeQuiz.id,
        contentId: completeQuiz.contentId,
        title: completeQuiz.title,
        timeLimit: completeQuiz.timeLimit,
        questionsCount: completeQuiz.questions.length,
        hasQuestions: Array.isArray(completeQuiz.questions) && completeQuiz.questions.length > 0
      });

      console.log(`Successfully built complete quiz object for ID ${id}`);
      return completeQuiz;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Error getting quiz with ID ${id}:`, error);
    throw error;
  }
}
