const KumoMathTester = artifacts.require("./KumoMathTester.sol")

contract('KumoMath', async accounts => {
  let kumoMathTester
  beforeEach('deploy tester', async () => {
    kumoMathTester = await KumoMathTester.new()
  })

  const checkFunction = async (func, cond, params) => {
    assert.equal(await kumoMathTester[func](...params), cond(...params))
  }

  it('max works if a > b', async () => {
    await checkFunction('callMax', (a, b) => Math.max(a, b), [2, 1])
  })

  it('max works if a = b', async () => {
    await checkFunction('callMax', (a, b) => Math.max(a, b), [2, 2])
  })

  it('max works if a < b', async () => {
    await checkFunction('callMax', (a, b) => Math.max(a, b), [1, 2])
  })
})
