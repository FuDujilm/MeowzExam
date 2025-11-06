const question = {
  options: [
    { id: "A", text: "选项A内容 ✓", is_correct: true },
    { id: "B", text: "选项B内容", is_correct: false },
    { id: "C", text: "选项C内容 ✓", is_correct: true },
    { id: "D", text: "选项D内容", is_correct: false }
  ],
  correctAnswers: ["A", "C"]
}

// 打乱
const originalOptions = [...question.options]
const shuffledContents = [...originalOptions].reverse() // 简单翻转模拟打乱
const optionIds = ['A', 'B', 'C', 'D']
const answerMapping = {}

const shuffledOptions = shuffledContents.map((opt, index) => {
  const newId = optionIds[index]
  const originalId = opt.id
  answerMapping[newId] = originalId
  return { id: newId, text: opt.text }
})

console.log('=== 前端显示 ===')
shuffledOptions.forEach(opt => {
  console.log(`${opt.id}. ${opt.text}`)
})
console.log('\n映射关系:', answerMapping)
console.log('原始正确答案:', question.correctAnswers)

// 用户看到"选项A内容 ✓"在A位置，"选项C内容 ✓"在C位置
// 所以选择A和C
const userChoice = ['A', 'C']
console.log('\n用户选择:', userChoice)

// 映射回原始ID
const mapped = userChoice.map(id => answerMapping[id])
console.log('映射回原始ID:', mapped)
console.log('判题:', JSON.stringify(mapped.sort()) === JSON.stringify(question.correctAnswers.sort()))
