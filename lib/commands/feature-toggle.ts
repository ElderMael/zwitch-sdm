import {JavaFileParser} from "@atomist/antlr";
import {astUtils, GitHubRepoRef, MatchResult, Project} from "@atomist/automation-client";
import {CodeTransform, GeneratorRegistration} from "@atomist/sdm";
import {TreeNode} from "@atomist/tree-path";
import * as _ from "lodash";

interface FeatureToggleParams {
    "remove.features": string;
    "seed.owner": string;
    "seed.name": string;
    "seed.branch": string;
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

const RemoveEchoFeatureTransform: CodeTransform<FeatureToggleParams> = async (
    project: Project,
    papi,
    params) => {

    const featuresToDelete = params["remove.features"]
        .split(",");

    const matches = await astUtils.findMatches(
        project,
        JavaFileParser,
        "**/*.java",
        `/compilationUnit//typeDeclaration`,
    );

    matches.filter(match => {
        const featureAnnotatedTypes = match
            .$children
            .filter(typeDeclaration => {
                if (!typeDeclaration.hasOwnProperty("annotation")) {
                    return false;
                }

                const annotatedTypeDeclaration = typeDeclaration as AnnotatedTypeDeclaration;
                const annotationName = annotatedTypeDeclaration.annotation.annotationName.$value;

                if (!(annotationName === "Feature")) {
                    return false;
                }

                const expressionValue = annotatedTypeDeclaration.annotation.elementValue.$value;
                const featureOnAnnotation = expressionValue.replace(/"/g, "");

                return annotationName === "Feature" &&
                    _.includes(featuresToDelete, featureOnAnnotation);
            });

        if (featureAnnotatedTypes.length > 0) {
            project.deleteFile(match.sourceLocation.path);
        }
    });
};

export const FeatureTogglingSeedGeneratorRegistration: GeneratorRegistration<FeatureToggleParams> = {
    name: "Clone Project",
    intent: "create seed instance",
    description: "Clones a git project and applies feature toggles to it",
    tags: ["java"],
    autoSubmit: true,
    startingPoint: params => {
        return GitHubRepoRef.from({
            owner: params["seed.owner"],
            repo: params["seed.name"],
            branch: params["seed.branch"],
        });
    },
    parameters: {
        "remove.features": {
            required: true,
            type: "string",
            displayName: "Comma Separated List Of Features To Delete",
        },
        "seed.branch": {
            required: true,
            type: "string",
            displayName: "Branch to use",
        },
        "seed.name": {
            required: true,
            type: "string",
            displayName: "GitHub repository name",
        },
        "seed.owner": {
            required: true,
            type: "string",
            displayName: "GitHub username",
        },
    },
    transform: [
        RemoveEchoFeatureTransform,
    ],
};
