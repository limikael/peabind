export function autoIndent(text, indentSize=4) {
    const lines = text.split('\n');
    let result = [];
    let indentLevel = 0;

    for (let line of lines) {
        // Strip whitespace from the line
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (trimmedLine === '') {
            continue;
        }
        
        // Decrease indent level if line starts with '}'
        if (trimmedLine.startsWith('}')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        
        // Add indentation
        const indentation = ' '.repeat(indentLevel * indentSize);
        result.push(indentation + trimmedLine);
        
        // Increase indent level if line ends with '{'
        if (trimmedLine.endsWith('{')) {
            indentLevel++;
        }
    }
    
    return result.join('\n');
}
