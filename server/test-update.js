// Test script to update a content record with a due date
import { pool } from './db.js';

async function testUpdate() {
  let client;
  try {
    console.log('Getting client from pool...');
    client = await pool.connect();

    // Get a content ID to update (first quiz content)
    const contentQuery = `
      SELECT c.id
      FROM contents c
      JOIN quizzes q ON c.id = q.content_id
      LIMIT 1
    `;

    const contentResult = await client.query(contentQuery);
    if (contentResult.rows.length === 0) {
      console.log('No quiz content found to update');
      return;
    }

    const contentId = contentResult.rows[0].id;
    console.log(`Found content ID: ${contentId}`);

    // Test 1: Update with null due date
    console.log('\nTest 1: Update with null due date');
    const nullDateQuery = `
      UPDATE contents
      SET title = 'Test Quiz Updated', due_date = NULL
      WHERE id = $1
      RETURNING *
    `;

    const nullDateResult = await client.query(nullDateQuery, [contentId]);
    console.log('Update result with null date:', nullDateResult.rows[0]);

    // Test 2: Update with a valid date
    console.log('\nTest 2: Update with valid date');
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 7); // 7 days from now

    const validDateQuery = `
      UPDATE contents
      SET title = 'Test Quiz with Due Date', due_date = $1
      WHERE id = $2
      RETURNING *
    `;

    const validDateResult = await client.query(validDateQuery, [validDate, contentId]);
    console.log('Update result with valid date:', validDateResult.rows[0]);

    // Test 3: Update with a date string
    console.log('\nTest 3: Update with date string');
    const dateString = '2023-12-31T23:59:00';

    const dateStringQuery = `
      UPDATE contents
      SET title = 'Test Quiz with Date String', due_date = $1::timestamp
      WHERE id = $2
      RETURNING *
    `;

    const dateStringResult = await client.query(dateStringQuery, [dateString, contentId]);
    console.log('Update result with date string:', dateStringResult.rows[0]);

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    if (client) {
      console.log('Releasing client back to pool');
      client.release();
    }
  }
}

// Run the test
testUpdate().then(() => {
  console.log('Test completed, closing pool');
  pool.end();
}).catch(err => {
  console.error('Unhandled error:', err);
  pool.end();
});
