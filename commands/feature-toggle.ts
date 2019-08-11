import {JavaFileParser} from "@atomist/antlr";
import {astUtils, GitHubRepoRef, MatchResult, Project} from "@atomist/automation-client";
import {CodeTransform, GeneratorRegistration} from "@atomist/sdm";
import {TreeNode} from "@atomist/tree-path";

interface FeatureToggleParams {
    "remove.feature": string;
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
        "remove.feature": {
            required: true,
            type: "string",
            displayName: "Feature To Delete",
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
