import "dotenv/config";
import type {
  Blueprint,
  BlueprintResponse,
  BlueprintVersionsResponseBody,
  Flow,
  Route,
} from "./blueprint.types";

const replaceResponseModuleContent = async (filePath: string) => {
  // verify the api token
  const apiToken = process.env.MAKE_API_TOKEN as string;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (!uuidRegex.test(apiToken))
    throw new Error(
      "The MAKE_API_TOKEN Doesnt match the regex for UUID token.",
    );
  const apiTokenHeader = "Token " + apiToken;

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
    { headers: { Authorization: apiTokenHeader } },
  );
  // TODO: verify request status
  if (getBlueprintVersionsResponse.status !== 200)
    throw new Error(
      "Blueprint versions request response is " +
        getBlueprintVersionsResponse.status,
    );
  const getBlueprintVersionsJson =
    (await getBlueprintVersionsResponse.json()) as BlueprintVersionsResponseBody;
  if (!getBlueprintVersionsJson.scenariosBlueprints)
    throw new Error("Blueprint versions request probably failed");

  const sortedBlueprintVersions =
    getBlueprintVersionsJson.scenariosBlueprints.sort(
      (a, b) => b.version - a.version,
    );

  const getNewestBlueprintResponse = await fetch(
    `https://we.make.com/api/v2/scenarios/${scenarioId}/blueprint?blueprintId=${sortedBlueprintVersions[0].version}`,
    { headers: { Authorization: apiTokenHeader } },
  );
  if (getNewestBlueprintResponse.status !== 200)
    throw new Error(
      "Blueprint request response is " + getNewestBlueprintResponse.status,
    );

  const getNewestBlueprint =
    (await getNewestBlueprintResponse.json()) as BlueprintResponse;

  const updatedFlow = updateFlow(
    getNewestBlueprint.response.blueprint.flow,
    parseInt(moduleId),
    content,
  );

  const newBlueprint = {
    ...getNewestBlueprint.response.blueprint,
    flow: updatedFlow,
  };
  console.log(newBlueprint);
  // console.log(JSON.stringify(getNewestBlueprint));
};

function updateFlow(flow: Flow, moduleId: number, newContent: string) {
  for (const module of flow) {
    if (module.id === moduleId) {
      module.mapper.body = newContent;
    }

    if (module.routes) {
      for (const route of module.routes) {
        updateFlow(route.flow, moduleId, newContent);
      }
    }
  }

  return flow;
}

await replaceResponseModuleContent("src/pages/landing.html");
