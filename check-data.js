async function checkData() {
  const { PrismaClient } = await import('./lib/generated/prisma')
  const prisma = new PrismaClient()

  try {
    const question = await prisma.question.findFirst({
      select: {
        externalId: true,
        title: true,
        options: true,
        correctAnswers: true,
      },
    })

    if (!question) {
      console.log('未找到题目数据')
      return
    }

    console.log('题目ID:', question.externalId)
    console.log('题目:', question.title)
    console.log('\n选项:', JSON.stringify(question.options, null, 2))
    console.log('\n正确答案:', JSON.stringify(question.correctAnswers, null, 2))
  } catch (error) {
    console.error('检查题库数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()
