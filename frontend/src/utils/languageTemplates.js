export const LANGUAGE_TEMPLATES = {
  javascript: `const fs = require('fs');

function main() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  if (!input) return;
  
  // Parse input and compute logic...
  // Example for Two Sum:
  // const [line1, line2] = input.split('\\n');
  
  console.log("Output");
}

main();
`,
  python: `import sys

def main():
    input_data = sys.stdin.read().strip()
    if not input_data:
        return
        
    # Parse input and compute logic...
    # Example for Two Sum:
    # lines = input_data.split('\\n')
    
    print("Output")

if __name__ == '__main__':
    main()
`,
  java: `import java.io.BufferedReader;
import java.io.InputStreamReader;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String input = br.readLine();
        
        if (input == null || input.trim().isEmpty()) {
            return;
        }
        
        // Parse input and compute logic...
        
        System.out.println("Output");
    }
}
`,
  cpp: `#include <iostream>
#include <string>

using namespace std;

int main() {
    string input;
    if (!getline(cin, input)) {
        return 0;
    }
    
    // Parse input and compute logic...
    
    cout << "Output" << endl;
    return 0;
}
`
};

export const getLanguageTemplate = (language, functionSignature = null) => {
  if (language.toLowerCase() === 'java' && functionSignature && functionSignature.functionName) {
    const params = (functionSignature.parameters || [])
      .map(p => `${p.type} ${p.name}`)
      .join(', ');
    return `class Solution {\n    public ${functionSignature.returnType} ${functionSignature.functionName}(${params}) {\n        \n    }\n}\n`;
  }
  return LANGUAGE_TEMPLATES[language.toLowerCase()] || '// Write your code here\n';
};
