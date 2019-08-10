/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {JavaFileParser} from "@atomist/antlr";
import {astUtils, GitHubRepoRef, Project} from "@atomist/automation-client";
import {FileHit} from "@atomist/automation-client/lib/tree/ast/FileHits";
import {CodeTransform, GeneratorRegistration} from "@atomist/sdm";
import {GoalConfigurer} from "@atomist/sdm-core";
import {SeedProjectGoals} from "./goals";

export const SeedProjectGoalConfigurer: GoalConfigurer<SeedProjectGoals> = async (sdm, goals) => {

    const RemoveEchoFeatureTransform: CodeTransform = async (project: Project) => {

        const [singleMatch]: FileHit[] = await astUtils.findFileMatches(
            project,
            JavaFileParser,
            "**/*.java",
            "/compilationUnit//classDeclaration[//Identifier[@value='EchoController']]");

        project.deleteFile(singleMatch.file.path);
    };

    const MicronautSeedGenerator: GeneratorRegistration = {
        name: "Micronaut Code Generator",
        intent: "create micronaut basic app without echo feature",
        description: "Creates a basic Micronaut Application",
        tags: ["micronaut", "java"],
        autoSubmit: true,
        startingPoint: GitHubRepoRef.from({
            owner: "ElderMael",
            repo: "micronaut-seed-app",
            branch: "master",
        }),
        transform: [
            RemoveEchoFeatureTransform,
        ],
    };

    sdm.addGeneratorCommand(MicronautSeedGenerator);

};
