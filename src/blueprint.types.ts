export type BlueprintVersionsResponseBody = {
  scenariosBlueprints: {
    created: string;
    version: number;
    scenarioId: number;
    draft: boolean;
  }[];
};

export type BlueprintResponse = {
  code: string;
  response: { blueprint: Blueprint };
};
export type Mapper = null | any;
export type ModuleMetadata = {
  expect: { name: string; type: string; label: string; required: boolean }[];
  restore: any;
};

export type Metadata = any;

export type Route = { flow: Flow }[];
export type Flow = Module[];

export type Module = {
  id: number;
  mapper: Mapper;
  module: string;
  version: number;
  metadata: Metadata;
  parameters: any;
  routes?: Route;
};

export type Blueprint = {
  flow: Flow;
  name: string;
  metadata: Metadata;
};
