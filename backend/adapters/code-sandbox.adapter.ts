import vm from "vm"

export interface CodeTestCase {
  input: unknown
  expectedOutput: unknown
  isHidden?: boolean
}

export interface CodeExecutionResult {
  passedCount: number
  totalCount: number
  allPassed: boolean
  scoreRatio: number
  executionMode: "isolated_vm_sandbox" | "judge0"
  durationMs: number
  cases: Array<{
    index: number
    isHidden: boolean
    passed: boolean
    actual?: string
    expected?: string
    error?: string
  }>
}

/**
 * Runs candidate JS code inside a strict Node VM context with no access to
 * process, fs, require, fetch, timers, or host globals, and enforces a 1000ms CPU timeout.
 */
export function runSandboxedJavaScript(
  code: string,
  functionName: string,
  testCases: CodeTestCase[]
): CodeExecutionResult {
  const start = Date.now()
  const results: CodeExecutionResult["cases"] = []
  let passedCount = 0

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i]
    const isHidden = Boolean(tc.isHidden)
    try {
      const sandbox: Record<string, unknown> = {
        __input: tc.input,
        __output: undefined,
      }
      const context = vm.createContext(sandbox, {
        codeGeneration: { strings: false, wasm: false },
      })

      const wrapped = `
        "use strict";
        ${code}
        if (typeof ${functionName} !== "function") {
          throw new Error("Expected function '${functionName}' to be defined.");
        }
        __output = Array.isArray(__input) ? ${functionName}(...__input) : ${functionName}(__input);
      `
      vm.runInContext(wrapped, context, { timeout: 1000 })

      const actualJson = JSON.stringify(sandbox.__output)
      const expectedJson = JSON.stringify(tc.expectedOutput)
      const passed = actualJson === expectedJson
      if (passed) passedCount++

      results.push({
        index: i + 1,
        isHidden,
        passed,
        actual: isHidden ? undefined : actualJson,
        expected: isHidden ? undefined : expectedJson,
      })
    } catch (err: any) {
      results.push({
        index: i + 1,
        isHidden,
        passed: false,
        error: isHidden ? "Hidden test case failed or timed out." : err?.message || "Runtime error",
      })
    }
  }

  const totalCount = testCases.length
  return {
    passedCount,
    totalCount,
    allPassed: totalCount > 0 && passedCount === totalCount,
    scoreRatio: totalCount > 0 ? passedCount / totalCount : 0,
    executionMode: "isolated_vm_sandbox",
    durationMs: Date.now() - start,
    cases: results,
  }
}
