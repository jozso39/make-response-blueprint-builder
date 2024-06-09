# Make module content replacer

This little thing takes HTML pages from `src/pages` and uploads them to correct modules in correct scenarios.

## Why

Because writing HTML in Make to the modules response window is painful. This way you can try it out.

## How to use it

You have to provide the module ID and scenario Id as comments in the HTML like this:

```html
<!-- scenarioId=5822 -->
<!-- moduleId=2 -->
```

Put this to an HTML file in `src/pages` and use command `bun run src/buildScenariosFromTemplate.ts`

### Authentication

you have to provide a `.env` file with your Make API token

```
MAKE_API_TOKEN="xxxxxxx"
```

# Instalation

This project uses [Bun](https://bun.sh) so you better install it.

```bash
bun install
```

This project was created using `bun init` in bun v1.0.30. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
