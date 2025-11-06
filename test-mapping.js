// 测试映射逻辑
const originalOptions = [
  { id: 'A', text: '选项A', is_correct: false },
  { id: 'B', text: '选项B', is_correct: true },
  { id: 'C', text: '选项C', is_correct: false },
  { id: 'D', text: '选项D', is_correct: false }
]

const correctAnswers = ['B']

// 模拟打乱
const shuffledContents = [...originalOptions].sort(() => Math.random() - 0.5)
const optionIds = ['A', 'B', 'C', 'D']
const answerMapping = {}

const shuffledOptions = shuffledContents.map((opt, index) => {
  const newId = optionIds[index]
  const originalId = opt.id
  answerMapping[newId] = originalId
  return { id: newId, text: opt.text }
})

console.log('原始选项:', originalOptions)
console.log('打乱后选项:', shuffledOptions)
console.log('映射关系 (新→原):', answerMapping)
console.log('原始正确答案:', correctAnswers)

// 用户选择新ID，需要映射回原始ID判题
const userAnswer = ['A'] // 假设用户选择A
const originalUserAnswer = userAnswer.map(ans => answerMapping[ans] || ans)
console.log('用户选择(新ID):', userAnswer)
console.log('映射回原始ID:', originalUserAnswer)
console.log('判题结果:', correctAnswers.includes(originalUserAnswer[0]))

// 反向：原始正确答案转换为新ID
const newCorrectAnswers = correctAnswers.map(originalId => {
  const newId = Object.keys(answerMapping).find(key => answerMapping[key] === originalId)
  return newId || originalId
})
console.log('新ID的正确答案:', newCorrectAnswers)
