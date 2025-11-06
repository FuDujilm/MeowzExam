// 模拟API处理逻辑
const question = {
  id: "test123",
  options: [
    { id: "A", text: "选项A内容", is_correct: true },
    { id: "B", text: "选项B内容", is_correct: false },
    { id: "C", text: "选项C内容", is_correct: true },
    { id: "D", text: "选项D内容", is_correct: false }
  ],
  correctAnswers: ["A", "C"]
}

console.log('=== 原始题目 ===')
console.log('正确答案:', question.correctAnswers)

// 打乱选项（模拟API逻辑）
let shuffledOptions = question.options
let answerMapping = {}

if (Array.isArray(question.options)) {
  const originalOptions = [...question.options]
  const shuffledContents = [...originalOptions].sort(() => Math.random() - 0.5)
  const optionIds = ['A', 'B', 'C', 'D']

  shuffledOptions = shuffledContents.map((opt, index) => {
    const newId = optionIds[index]
    const originalId = opt.id
    answerMapping[newId] = originalId
    
    return {
      id: newId,
      text: opt.text,
    }
  })
}

console.log('\n=== 打乱后返回给前端 ===')
console.log('选项:', shuffledOptions)
console.log('映射:', answerMapping)

// 用户提交（假设选了打乱后的A和C）
const userAnswer = ['A', 'C']
console.log('\n=== 用户提交 ===')
console.log('用户选择(新ID):', userAnswer)

// 后端判题
const originalUserAnswer = userAnswer.map(ans => answerMapping[ans] || ans)
console.log('映射回原始ID:', originalUserAnswer)

const correctAnswers = question.correctAnswers
const isCorrect = 
  correctAnswers.length === originalUserAnswer.length &&
  correctAnswers.sort().every((val, index) => val === originalUserAnswer.sort()[index])

console.log('原始正确答案:', correctAnswers)
console.log('判题结果:', isCorrect)
