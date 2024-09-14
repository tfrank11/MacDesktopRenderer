# Perf benchmarking

- 400 cells
- go from all 0 to all 1 and back
- 10 cycles

  | parallel scripts | avg MS |
  | ---------------- | ------ |
  | 1                | 4138   |
  | 2                | 3840   |
  | 4                | 3774   |
  | 8                | 3529   |
  | 16               | 3946   |
  | 32               | 4779   |
