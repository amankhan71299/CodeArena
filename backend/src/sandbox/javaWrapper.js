export const generateJavaWrapper = (functionSignature) => {
  const { functionName, returnType, parameters } = functionSignature;

  // We write a simple hidden Main class that parses standard input
  let wrapper = `

public class Main {
    public static void main(String[] args) throws Exception {
        java.util.Scanner scanner = new java.util.Scanner(System.in);
        // Read all input into a single string
        StringBuilder sb = new StringBuilder();
        while (scanner.hasNextLine()) {
            sb.append(scanner.nextLine()).append("\\n");
        }
        String input = sb.toString().trim();
        if (input.isEmpty()) return;

        Parser parser = new Parser(input);
        Solution solution = new Solution();
`;

  // Parse parameters
  for (let i = 0; i < parameters.length; i++) {
    const param = parameters[i];
    const type = param.type.trim();
    const name = param.name.trim();

    if (type === 'int') {
      wrapper += `        int ${name} = parser.nextInt();\n`;
    } else if (type === 'long') {
      wrapper += `        long ${name} = parser.nextLong();\n`;
    } else if (type === 'double') {
      wrapper += `        double ${name} = parser.nextDouble();\n`;
    } else if (type === 'boolean') {
      wrapper += `        boolean ${name} = parser.nextBoolean();\n`;
    } else if (type === 'String') {
      wrapper += `        String ${name} = parser.nextString();\n`;
    } else if (type === 'int[]') {
      wrapper += `        int[] ${name} = parser.nextIntArray();\n`;
    } else if (type === 'long[]') {
      wrapper += `        long[] ${name} = parser.nextLongArray();\n`;
    } else if (type === 'double[]') {
      wrapper += `        double[] ${name} = parser.nextDoubleArray();\n`;
    } else if (type === 'String[]') {
      wrapper += `        String[] ${name} = parser.nextStringArray();\n`;
    } else if (type === 'int[][]') {
      wrapper += `        int[][] ${name} = parser.nextInt2DArray();\n`;
    } else if (type.startsWith('List<Integer>')) {
      wrapper += `        java.util.List<Integer> ${name} = parser.nextIntegerList();\n`;
    } else if (type.startsWith('List<String>')) {
      wrapper += `        java.util.List<String> ${name} = parser.nextStringList();\n`;
    } else {
      wrapper += `        // Unsupported parameter type: ${type}\n`;
    }
  }

  // Call method
  const paramNames = parameters.map(p => p.name).join(', ');
  wrapper += `\n        ${returnType !== 'void' ? `${returnType} result = ` : ''}solution.${functionName}(${paramNames});\n`;

  // Format output
  if (returnType === 'void') {
    wrapper += `        System.out.println("null");\n`;
  } else if (returnType === 'int[]' || returnType === 'long[]' || returnType === 'double[]') {
    wrapper += `        System.out.println(java.util.Arrays.toString(result).replaceAll(" ", ""));\n`;
  } else if (returnType === 'String[]') {
    wrapper += `        System.out.println(java.util.Arrays.toString(result));\n`; // simplified
  } else if (returnType === 'int[][]') {
    wrapper += `        System.out.println(java.util.Arrays.deepToString(result).replaceAll(" ", ""));\n`;
  } else {
    wrapper += `        System.out.println(result);\n`;
  }

  wrapper += `    }

    static class Parser {
        String s;
        int pos = 0;
        Parser(String s) { this.s = s; }
        
        void skipWhitespace() {
            while (pos < s.length() && Character.isWhitespace(s.charAt(pos))) {
                pos++;
            }
        }
        
        String nextRawToken() {
            skipWhitespace();
            if (pos >= s.length()) return "";
            if (s.charAt(pos) == '"') {
                int start = pos++;
                while (pos < s.length() && s.charAt(pos) != '"') pos++;
                if (pos < s.length()) pos++; // skip closing quote
                return s.substring(start, pos);
            }
            if (s.charAt(pos) == '[') {
                int start = pos++;
                int depth = 1;
                while (pos < s.length() && depth > 0) {
                    char c = s.charAt(pos);
                    if (c == '[') depth++;
                    else if (c == ']') depth--;
                    else if (c == '"') {
                        pos++;
                        while (pos < s.length() && s.charAt(pos) != '"') pos++;
                    }
                    pos++;
                }
                return s.substring(start, pos);
            }
            int start = pos;
            while (pos < s.length() && !Character.isWhitespace(s.charAt(pos)) && s.charAt(pos) != ',') {
                pos++;
            }
            return s.substring(start, pos);
        }
        
        void skipComma() {
            skipWhitespace();
            if (pos < s.length() && s.charAt(pos) == ',') {
                pos++;
            }
        }
        
        int nextInt() {
            String t = nextRawToken();
            return Integer.parseInt(t.replaceAll("[^\\\\d\\\\-]", ""));
        }
        
        long nextLong() {
            String t = nextRawToken();
            return Long.parseLong(t.replaceAll("[^\\\\d\\\\-]", ""));
        }
        
        double nextDouble() {
            String t = nextRawToken();
            return Double.parseDouble(t.replaceAll("[^\\\\d\\\\.\\\\-]", ""));
        }
        
        boolean nextBoolean() {
            String t = nextRawToken();
            return Boolean.parseBoolean(t.replaceAll("[^a-zA-Z]", ""));
        }
        
        String nextString() {
            String t = nextRawToken();
            if (t.startsWith("\\"") && t.endsWith("\\"")) {
                return t.substring(1, t.length() - 1);
            }
            return t;
        }
        
        int[] nextIntArray() {
            String t = nextRawToken();
            t = t.trim();
            if (t.startsWith("[")) t = t.substring(1);
            if (t.endsWith("]")) t = t.substring(0, t.length() - 1);
            t = t.trim();
            if (t.isEmpty()) return new int[0];
            String[] parts = t.split(",");
            int[] arr = new int[parts.length];
            for (int i = 0; i < parts.length; i++) {
                arr[i] = Integer.parseInt(parts[i].trim());
            }
            return arr;
        }
        
        long[] nextLongArray() {
            String t = nextRawToken();
            t = t.trim();
            if (t.startsWith("[")) t = t.substring(1);
            if (t.endsWith("]")) t = t.substring(0, t.length() - 1);
            t = t.trim();
            if (t.isEmpty()) return new long[0];
            String[] parts = t.split(",");
            long[] arr = new long[parts.length];
            for (int i = 0; i < parts.length; i++) {
                arr[i] = Long.parseLong(parts[i].trim());
            }
            return arr;
        }
        
        double[] nextDoubleArray() {
            String t = nextRawToken();
            t = t.trim();
            if (t.startsWith("[")) t = t.substring(1);
            if (t.endsWith("]")) t = t.substring(0, t.length() - 1);
            t = t.trim();
            if (t.isEmpty()) return new double[0];
            String[] parts = t.split(",");
            double[] arr = new double[parts.length];
            for (int i = 0; i < parts.length; i++) {
                arr[i] = Double.parseDouble(parts[i].trim());
            }
            return arr;
        }
        
        String[] nextStringArray() {
            String t = nextRawToken();
            t = t.trim();
            if (t.startsWith("[")) t = t.substring(1);
            if (t.endsWith("]")) t = t.substring(0, t.length() - 1);
            t = t.trim();
            if (t.isEmpty()) return new String[0];
            // Simplistic CSV split for strings, assuming no commas inside strings
            String[] parts = t.split(",");
            for (int i = 0; i < parts.length; i++) {
                String s = parts[i].trim();
                if (s.startsWith("\\"") && s.endsWith("\\"")) s = s.substring(1, s.length() - 1);
                parts[i] = s;
            }
            return parts;
        }
        
        int[][] nextInt2DArray() {
            String t = nextRawToken();
            t = t.trim();
            if (t.startsWith("[")) t = t.substring(1, t.length() - 1).trim();
            if (t.isEmpty()) return new int[0][0];
            
            java.util.List<int[]> rows = new java.util.ArrayList<>();
            Parser innerParser = new Parser(t);
            while (innerParser.pos < innerParser.s.length()) {
                innerParser.skipWhitespace();
                if (innerParser.pos >= innerParser.s.length()) break;
                if (innerParser.s.charAt(innerParser.pos) == ',') {
                    innerParser.pos++;
                    continue;
                }
                rows.add(innerParser.nextIntArray());
            }
            return rows.toArray(new int[0][]);
        }
        
        java.util.List<Integer> nextIntegerList() {
            int[] arr = nextIntArray();
            java.util.List<Integer> list = new java.util.ArrayList<>();
            for (int v : arr) list.add(v);
            return list;
        }
        
        java.util.List<String> nextStringList() {
            String[] arr = nextStringArray();
            return java.util.Arrays.asList(arr);
        }
    }
}
`;
  return wrapper;
};
