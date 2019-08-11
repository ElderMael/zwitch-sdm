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

            if (!child.hasOwnProperty("annotation")) {
                return false;
            }

            const annotation = (child as AnnotatedTypeDeclaration).annotation;

            const isNotFeatureAnnotation = annotation.annotationName.$value !== "Feature";

            if (isNotFeatureAnnotation) {
                return false;
            }

            const featureName = annotation.elementValue.$value.replace(/"/g, "");

            return _.includes(featuresToDelete, featureName);
        });

    return childrenWithFeatureAnnotation.length > 0;
}

async function deleteFeatureFiles(project: Project, featuresToDelete: string[]): Promise<Project> {
    const javaTypeDeclarations = await astUtils.findMatches(
        project,
        JavaFileParser,
        "**/*.java",
        `/compilationUnit//typeDeclaration`,
    );

    const filesToDelete = javaTypeDeclarations
        .filter(typeDeclaration => {
            return hasFeatureAnnotationAndFeatureToDelete(typeDeclaration, featuresToDelete);
        })
        .map(featureMatch => featureMatch.sourceLocation.path);

    const promisesOfDeletion = filesToDelete.map(file => project.deleteFile(file));

    return Promise.all(promisesOfDeletion).then(_.head);
}

const RemoveEchoFeatureTransform: CodeTransform<FeatureToggleParams> = async (
    project: Project,
    papi,
    params) => {

    const featuresToDelete = _.compact(params["remove.features"].split(","));

    if (_.isEmpty(featuresToDelete)) {
        return Promise.resolve();
    }

    return deleteFeatureFiles(project, featuresToDelete);

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
