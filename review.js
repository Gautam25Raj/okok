const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

console.log(`GROQ_API_KEY length: ${process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 'Not set'}`);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// This is review file
const reviewFile = async (content, fileName) => {
  console.log(`Reviewing file: ${fileName}`);
  let responseText = '';

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a code reviewer. Review the following code file named ${fileName} based on best practices, code efficiency, and clarity. Provide a score from 1 to 10 and a brief feedback message.\n\n${content}\n\nRespond with no formatting, in the following structure:\n{\n"points": int,\n"message": str\n}`
        },
        {
          role: "user",
          content: ""
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0,
      max_tokens: 1024,
      top_p: 1,
      stream: true,
      stop: null
    });

    for await (const chunk of chatCompletion) {
      const content = chunk.choices[0]?.delta?.content || '';
      responseText += content;
      process.stdout.write(content);
    }

    console.log('\nAPI Response:', responseText);
    const result = JSON.parse(responseText.trim());
    return result;
  } catch (error) {
    console.error('Error during API call:', error);
    return { points: 0, message: 'Error occurred during review' };
  }
};
async function main() {
  const changedFiles = process.argv.slice(2);
  const reviews = await Promise.all(changedFiles.map(async (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const review = await reviewFile(content, fileName);
    return { file: fileName, message: review.message, score: review.points };
  }));

  const comment = reviews.map(review => `
| 📂 **File**   | 💬 **Comment** | 🏆 **Score**    |
| :-----------: |---------------| :-------------: |
| \`${review.file}\` | ${review.message} | ${review.score}/10 |
  `).join('\n');

  console.log(comment);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
