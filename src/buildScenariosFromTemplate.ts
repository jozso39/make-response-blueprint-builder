import "dotenv/config";

const apiToken = `Token ${process.env.MAKE_API_TOKEN}`;

const replaceResponseModuleContent = async (filePath: string) => {
  const file = Bun.file(filePath);
  const content = await file.text();
  const scenarioIdMatch = content.match(/<!-- scenarioId=(\d{1,7}) -->/);
  if (!scenarioIdMatch)
    throw new Error(
      'scenario ID must be defined as comment in HTML like this: "<!-- scenarioId=123 -->"',
    );
  const moduleIdMatch = content.match(/<!-- moduleId=(\d{1,7}) -->/);
  if (!moduleIdMatch)
    throw new Error(
      'module ID must be defined as comment in HTML like this: "<!-- moduleId=123 -->"',
    );

  const scenarioId = scenarioIdMatch[1];
  const moduleId = moduleIdMatch[1];
  const getBlueprintVersionsResponse = await fetch(
    `https://we.make.com/api/v2/scenarios/${scenarioId}/blueprints`,
    { headers: { Authorization: apiToken } },
  );
  const scenarioVersionId = await getBlueprintVersionsResponse.json(); //TODO
  console.log(scenarioVersions);
  //TODO: find the module and replace the content
};

console.log(process.env.MAKE_API_TOKEN);

await replaceResponseModuleContent("src/pages/landing.html");
