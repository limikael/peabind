export function escapeCString(str) {
    return str
        .replace(/\\/g, '\\\\')   // backslash
        .replace(/"/g, '\\"')     // double quote
        .replace(/\n/g, '\\n')    // newline
        .replace(/\r/g, '\\r')    // carriage return
        .replace(/\t/g, '\\t');   // tab
}

export function stripImportsAndExports(src) {
    let lines=src.split("\n");
    lines=lines.filter(line=>!line.startsWith("import") && !line.startsWith("export default"));
    lines=lines.map(line=>{
        if (line.startsWith("export"))
            return line.slice(6);

        return line;
    });
    return lines.join("\n");
}

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
    
    return result.join('\n')+"\n";
}

export function ifdefWrap(ifdef, content) {
    if (!ifdef)
        return content;

    return `
        #ifdef ${ifdef}
        ${content}
        #endif
    `
}
