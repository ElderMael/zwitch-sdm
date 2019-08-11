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
import {astUtils, GitHubRepoRef, MatchResult, Project} from "@atomist/automation-client";
import {CodeTransform, GeneratorRegistration} from "@atomist/sdm";
import {configure} from "@atomist/sdm-core";
import {TreeNode} from "@atomist/tree-path";
import {SeedProjectGoals} from "./lib/goals/goals";

interface FeatureToggleParams {
    "remove.feature": string;
}

interface ElementValue extends TreeNode {
    expression: TreeNode;
}

interface AnnotationAstNode extends TreeNode {
    annotationName: TreeNode;
    elementValues: ElementValue[];
    elementValue: ElementValue;
}

interface AnnotatedTypeDeclaration extends MatchResult {
    annotation: AnnotationAstNode;
}

export const configuration = configure<SeedProjectGoals>(async sdm => {

    const RemoveEchoFeatureTransform: CodeTransform<FeatureToggleParams> = async (
        project: Project,
        papi,
        params) => {

        const featureToDelete = params["remove.feature"];

        const matches = await astUtils.findMatches(
            project,
            JavaFileParser,
            "**/*.java",
            `/compilationUnit//typeDeclaration`,
        );

        matches.filter(match => {
            const featureAnnotatedTypes = match
                .$children
                .filter(child => child.hasOwnProperty("annotation"))
                .filter(typeDeclaration => {
                    const annotatedTypeDeclaration = typeDeclaration as AnnotatedTypeDeclaration;
                    const annotationName = annotatedTypeDeclaration.annotation.annotationName.$value;
                    const annotationFeature = annotatedTypeDeclaration.annotation.elementValue.$value;
                    return annotationName === "Feature" && annotationFeature === `"${featureToDelete}"`;
                });

            if (featureAnnotatedTypes.length > 0) {
                project.deleteFile(match.sourceLocation.path);
            }
        });
    };

    const FeatureTogglingSeedGeneratorRegistration: GeneratorRegistration<FeatureToggleParams> = {
        name: "Micronaut Code Generator",
        intent: "create micronaut app",
        description: "Creates a basic Micronaut Application",
        tags: ["micronaut", "java"],
        autoSubmit: true,
        startingPoint: GitHubRepoRef.from({
            owner: "ElderMael",
            repo: "micronaut-seed-app",
            branch: "master",
        }),
        parameters: {
            "remove.feature": {
                required: true,
                type: "string",
                displayName: "Feature To Delete",
            },
        },
        transform: [
            RemoveEchoFeatureTransform,
        ],
    };

    sdm.addGeneratorCommand(FeatureTogglingSeedGeneratorRegistration);

});
