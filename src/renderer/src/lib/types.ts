export interface ProblemStatementData {
  problem_statement: string
  input_format: {
    description: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: any
  }
  output_format: {
    description: string
    type: string
    subtype: string
  }
  complexity: {
    time: string
    space: string
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  test_cases: any[]
  validation_type: string
  difficulty: string
}

export interface Solution {
  initial_thoughts: string[]
  thought_steps: string[]
  description: string
  code: string
}

export interface SolutionsResponse {
  [key: string]: Solution
}

export interface Screenshot {
  path: string
  preview: string
}
