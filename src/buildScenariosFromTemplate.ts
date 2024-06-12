import "dotenv/config";
import type {
  Blueprint,
  BlueprintResponse,
  BlueprintVersionsResponseBody,
  Flow,
} from "./blueprint.types";
import { Glob } from "bun";

type FileData = {
  fileContent: string;
  scenarioId: string;
  moduleId: string;
  mapperChild?: string;
};

type BlueprintToScenario = {
  blueprint: Blueprint;
  scenarioId: string;
};

const getBlueprints = async (
  fileDataArray: FileData[],
): Promise<BlueprintToScenario[]> => {
  let blueprintContents: BlueprintToScenario[] = [];
  for (const fileData of fileDataArray) {
    if (
      blueprintContents.filter(
        (content) => content.scenarioId === fileData.scenarioId,
      ).length
    ) {
      console.log(
        `Will not download blueprint for scenario ID ${fileData.scenarioId}, because its already downloaded`,
      );
      continue;
    }

    const apiToken = process.env.MAKE_API_TOKEN as string;
    const apiTokenHeader = "Token " + apiToken;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    if (!uuidRegex.test(apiToken))
      throw new Error(
        "The MAKE_API_TOKEN Doesnt match the regex for UUID token.",
      );

    const getBlueprintVersionsResponse = await fetch(
      `https://we.make.com/api/v2/scenarios/${fileData.scenarioId}/blueprints`,
      { headers: { Authorization: apiTokenHeader } },
    );
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
      `https://we.make.com/api/v2/scenarios/${fileData.scenarioId}/blueprint?blueprintId=${sortedBlueprintVersions[0].version}`,
      { headers: { Authorization: apiTokenHeader } },
    );
    if (getNewestBlueprintResponse.status !== 200)
      throw new Error(
        "Blueprint request response is " + getNewestBlueprintResponse.status,
      );

    const getNewestBlueprint =
      (await getNewestBlueprintResponse.json()) as BlueprintResponse;
    blueprintContents.push({
      scenarioId: fileData.scenarioId,
      blueprint: getNewestBlueprint.response.blueprint,
    });
    console.log(`Downloaded blueprint for scenario ID ${fileData.scenarioId}`);
  }
  return blueprintContents;
};

const getFileContents = async (filePath: string): Promise<FileData> => {
  const file = Bun.file(filePath);
  const content = await file.text();
  const scenarioIdMatch = content.match(/<!-- scenarioId=(\d{1,7}) -->/);
  if (!scenarioIdMatch)
    throw new Error(
      'scenario ID must be defined as comment in HTML like this: "<!-- scenarioId=123 -->"',
    );
  const moduleIdMatch = content.match(/<!-- moduleId=(\d{1,7}) -->/);
  const mapperChildMatch = content.match(
    /<!-- mapperChild=([a-zA-Z0-9]{1,30}) -->/,
  );
  if (!moduleIdMatch)
    throw new Error(
      'module ID must be defined as comment in HTML like this: "<!-- moduleId=123 -->"',
    );

  const scenarioId = scenarioIdMatch[1];
  const moduleId = moduleIdMatch[1];

  const mapperChild = mapperChildMatch ? mapperChildMatch[1] : undefined;
  return { fileContent: content, scenarioId, moduleId, mapperChild };
};

const updateBlueprints = async (
  fileDataArray: FileData[],
  blueprintScenarioPairs: BlueprintToScenario[],
): Promise<BlueprintToScenario[]> => {
  let newBlueprintScenarioPairs: BlueprintToScenario[] = [];
  for (const blueprintPair of blueprintScenarioPairs) {
    const thisScenariosData = fileDataArray.filter(
      (fileData) => fileData.scenarioId === blueprintPair.scenarioId,
    );
    let updatedBlueprint: Blueprint = blueprintPair.blueprint;
    for (const scenarioData of thisScenariosData) {
      const newFlow = updateFlow(
        updatedBlueprint.flow,
        scenarioData.moduleId,
        scenarioData.fileContent,
        scenarioData.mapperChild,
      );
      updatedBlueprint = {
        ...updatedBlueprint,
        flow: newFlow,
      };

      console.log(
        `Updating content for module ${scenarioData.moduleId} in scenario ${scenarioData.scenarioId}`,
      );
    }
    newBlueprintScenarioPairs.push({
      blueprint: updatedBlueprint,
      scenarioId: blueprintPair.scenarioId,
    });
    console.log(`updated blueprint for scenario ${blueprintPair.scenarioId}`);
  }
  return newBlueprintScenarioPairs;
};

const uploadBlueprints = async (
  blueprintScenarioPairs: BlueprintToScenario[],
) => {
  const apiToken = process.env.MAKE_API_TOKEN as string;
  const apiTokenHeader = "Token " + apiToken;

  for (const pair of blueprintScenarioPairs) {
    const updateScenarioResponse = await fetch(
      `https://we.make.com/api/v2/scenarios/${pair.scenarioId}?confirmed=true`,
      {
        method: "PATCH",
        headers: {
          Authorization: apiTokenHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blueprint: JSON.stringify(pair.blueprint) }),
      },
    );
    if (updateScenarioResponse.status != 200)
      throw new Error(
        `The request for updating scenario blueprint failed with status code ${updateScenarioResponse.status}`,
      );
  }
};

const updateFlow = (
  flow: Flow,
  moduleId: string,
  newContent: string,
  mapperChild: string = "body",
) => {
  for (const module of flow) {
    if (module.id.toString() === moduleId) {
      module.mapper[mapperChild] = newContent;
    }

    if (module.routes) {
      for (const route of module.routes) {
        updateFlow(route.flow, moduleId, newContent, mapperChild);
      }
    }
  }
  return flow;
};

const doTheThing = async (folderPath: string) => {
  const htmlGlob = new Glob(folderPath + "/*.html");

  let fileDataArray: FileData[] = [];
  for (const filePath of htmlGlob.scanSync(".")) {
    fileDataArray.push(await getFileContents(filePath));
    console.log(`saved data from file ` + filePath);
  }
  const blueprintsToScenarioPairs: BlueprintToScenario[] = await getBlueprints(
    fileDataArray,
  );
  const updatedPairs = await updateBlueprints(
    fileDataArray,
    blueprintsToScenarioPairs,
  );
  uploadBlueprints(updatedPairs);
};
doTheThing("src/pages");
