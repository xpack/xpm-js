# Copilot Instructions

## Language and Tone

- Use British English spelling and grammar (e.g., "behaviour", "colour", "organise", "analyse", "favour", "innitialise", etc.)
- Maintain a professional and formal tone in all generated content
- Avoid colloquialisms, slang, or informal expressions
- Avoid humour, jokes, or casual remarks
- Use clear, precise, and professional language appropriate for technical documentation
- Avoid contractions (e.g., use "do not" instead of "don't")
- Use the Oxford comma in lists for clarity
- Maintain consistency in terminology throughout the codebase
- Prefer "folder" to "directory"

## TypeScript Code Style

- Follow the existing ESlint TypeScript conventions (the rules defined by the `typescript-eslint` and `prettier` projects)
- Use consistent formatting and naming conventions based on prettier and ESLint configurations

## Documentation

- Add comprehensive TSDoc comments accepted by API Extractor
- Document all classes, methods, properties, parameters, and return types
- Document private and protected members as well
- Keep the line length below 80 characters
- If the code already includes documentation, review and possibly improve it
- Preserve the `// eslint-disable-next-line` comments when present
- Use `@remarks` for additional detailed notes or explanations within TSDoc comments; this should be placed after the summary and before any tags
- Use `@param` and `@returns` tags appropriately in TSDoc comments; place `@param` tags immediately after the summary and before `@returns`
- Use `@throws {@link ExceptionName}` for exceptions and place the descriptions on the next line; place these tags after `@returns`
- Precede `@throws` tags with an empty line, and place the description on the next line
- Do not documnent exceptions thrown by assertions
- Do not add `@public` or `@internal` tags 
- When generating lists in TSDoc `@remarks` comments, use html `<ol>` and `<li>` tags for ordered lists, and `<ul>` and `<li>` tags for unordered lists. 
- inside html lists, do not use markdown syntax for bold or italics, use `<b>`, `<i>` html tags instead
- inside html lists, do not use markdown syntax for code, use `<code>` html tags  instead 
- inside html lists, do not use `{@link name}` syntax for links, use `<code>` html tags  instead
- outside of html lists, use markdown syntax for code (`code`) and links (`{@link name}`)
- In the `@remarks` section, first explain why the method or property is useful, then explain how to use it, and finally provide any additional notes or details.

## Folder Structure

- `/src`: Contains the TypeScript source code
- `/tests`: Contains the test suites and test cases
- `/templates`: Contains any template files used for code generation or project scaffolding