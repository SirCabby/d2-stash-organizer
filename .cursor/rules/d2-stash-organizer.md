# D2 Stash Organizer - Project Rules

## Project Overview
This is a TypeScript/Node.js project for organizing Diablo 2 stash files. The project is built and tested on Windows.

## Build and Validation
- **Always run `make build` to validate code changes**
- The build process includes:
  - Code formatting with Prettier
  - Linting with ESLint (zero warnings allowed)
  - TypeScript compilation
  - Rollup bundling for production

## Windows-Specific Considerations
- This project is designed for Windows environments
- Use Windows-compatible commands and paths
- The build system uses Windows batch files (e.g., `kill_port.bat`)
- File operations should use Windows path separators when necessary

## Development Workflow
1. Make code changes
2. Run `make build` to validate
3. Fix any linting or compilation errors
4. Test functionality
5. Commit changes

## Key Commands
- `make install` - Install dependencies
- `make build` - Build and validate the project
- `make run` - Start development server
- `make regenerate` - Regenerate game data files

## Code Quality Standards
- Follow TypeScript best practices
- Maintain zero ESLint warnings
- Use Prettier for consistent formatting
- Write clear, documented code

## File Structure
- Source code in `src/` directory
- Game data in `game-data/` directory
- Web interface in `src/web/` directory
- Scripts in `src/scripts/` directory 