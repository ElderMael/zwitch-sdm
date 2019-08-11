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

function hasFeatureAnnotationAndFeatureToDelete(typeDeclaration: MatchResult, featuresToDelete: string[]): boolean {
    const childrenWithFeatureAnnotation = typeDeclaration
        .$children
        .filter(child => {
            return child.hasOwnProperty("annotation");
        })
        .filter(annotationDeclaration => {
            const annotation = (annotationDeclaration as AnnotatedTypeDeclaration).annotation;

            const isNotFeatureAnnotation = annotation.annotationName.$value !== "Feature";

            if (isNotFeatureAnnotation) {
                return false;
            }

            const featureOnAnnotation = annotation.elementValue.$value.replace(/"/g, "");
            return _.includes(featuresToDelete, featureOnAnnotation);
        });

    return childrenWithFeatureAnnotation.length > 0;
}

const RemoveEchoFeatureTransform: CodeTransform<FeatureToggleParams> = async (
    project: Project,
    papi,
    params) => {

    const featuresToDelete = params["remove.features"]
        .split(",");

    const javaTypeDeclarations = await astUtils.findMatches(
        project,
        JavaFileParser,
        "**/*.java",
        `/compilationUnit//typeDeclaration`,
    );

    const filesToDelete = javaTypeDeclarations
        .filter(typeDeclaration => {
            return typeDeclaration.$children.some(child => {
                return child.hasOwnProperty("annotation");
            });
        })
        .filter(typeDeclaration => {
            return hasFeatureAnnotationAndFeatureToDelete(typeDeclaration, featuresToDelete);
        })
        .map(featureMatch => featureMatch.sourceLocation.path);

    filesToDelete.forEach(file => project.deleteFile(file));

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
