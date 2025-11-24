const { spawn } = require('child_process');
const path = require('path');

/**
 * Bridge to call Python PDF parsers
 * Uses pdfplumber for accurate PDF extraction
 */

const PYTHON_PARSERS_DIR = path.join(__dirname, '../pythonParsers');

/**
 * Execute Python parser script
 * @param {string} scriptName - Name of Python script (e.g., 'type1_parser.py')
 * @param {string} pdfPath - Absolute path to PDF file
 * @returns {Promise<Object>} Parsed data from Python
 */
function executePythonParser(scriptName, pdfPath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PYTHON_PARSERS_DIR, scriptName);

    // Spawn Python process
    const python = spawn('python3', [scriptPath, pdfPath]);

    let stdout = '';
    let stderr = '';

    // Collect stdout
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Collect stderr
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle process completion
    python.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python parser stderr: ${stderr}`);
        return reject(new Error(`Python parser exited with code ${code}: ${stderr}`));
      }

      try {
        const result = JSON.parse(stdout);
        if (!result.success) {
          return reject(new Error(result.error || 'Python parser failed'));
        }
        resolve(result);
      } catch (err) {
        console.error('Failed to parse Python output:', stdout);
        reject(new Error(`Failed to parse Python output: ${err.message}`));
      }
    });

    // Handle errors
    python.on('error', (err) => {
      reject(new Error(`Failed to start Python parser: ${err.message}`));
    });
  });
}

/**
 * Type1 PDF Parser - Yuqumli va Parazitar Kasalliklar
 */
class Type1PDFParser {
  static async parse(pdfPath) {
    try {
      const result = await executePythonParser('type1_parser.py', pdfPath);
      return {
        raw: result.raw,
        parsed: result.parsed,
        metadata: result.metadata,
      };
    } catch (error) {
      throw new Error(`Type1 PDF parsing error: ${error.message}`);
    }
  }
}

/**
 * Type2 PDF Parser - Sil Kasalligi
 */
class Type2PDFParser {
  static async parse(pdfPath) {
    try {
      const result = await executePythonParser('type2_parser.py', pdfPath);
      return {
        raw: result.raw,
        parsed: result.parsed,
        metadata: result.metadata,
      };
    } catch (error) {
      throw new Error(`Type2 PDF parsing error: ${error.message}`);
    }
  }
}

/**
 * Type3 PDF Parser - Qisqacha forma
 */
class Type3PDFParser {
  static async parse(pdfPath) {
    try {
      const result = await executePythonParser('type3_parser.py', pdfPath);
      return {
        raw: result.raw,
        parsed: result.parsed,
        metadata: result.metadata,
      };
    } catch (error) {
      throw new Error(`Type3 PDF parsing error: ${error.message}`);
    }
  }
}

module.exports = {
  Type1PDFParser,
  Type2PDFParser,
  Type3PDFParser,
};
