import {JavaFileParser} from "@atomist/antlr";
import {astUtils, GitCommandGitProject, GitHubRepoRef, GitProject, MatchResult, Project} from "@atomist/automation-client";
import {CodeTransform, GeneratorRegistration} from "@atomist/sdm";
import {TreeNode} from "@atomist/tree-path";
import * as _ from "lodash";

interface FeatureToggleParams {

    "remove.features": string;
    "seed.owner": string;
    "seed.name": string;
    "seed.branch": string;

    "copy.features": string;
    "reference.owner": string;
    "reference.name": string;
    "reference.branch": string;

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

interface FileNode extends TreeNode {
    path: string;
}

function hasFeatureAnnotationAndFeatureToDelete(typeDeclaration: MatchResult,
                                                featuresToDelete: string[]): boolean {
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

const RemoveFeatureTransform: CodeTransform<FeatureToggleParams> = async (
    project: Project,
    papi,
    params) => {

    const featuresToDelete = _.compact(params["remove.features"].split(","));

    if (_.isEmpty(featuresToDelete)) {
        return Promise.resolve();
    }

    return deleteFeatureFiles(project, featuresToDelete);

};

const CopyFeatureTransform: CodeTransform<FeatureToggleParams> = async (
    project: Project,
    papi,
    params) => {

    const featuresToCopy = _.compact(params["copy.features"].split(","));

    if (_.isEmpty(featuresToCopy)) {
        return Promise.resolve();
    }

    const referenceRepo = GitHubRepoRef.from({
        owner: params["reference.owner"],
        repo: params["reference.name"],
        branch: params["reference.branch"],
    });

    const referenceProject: GitProject = await GitCommandGitProject.cloned(undefined, referenceRepo);

    const featureTypes = await astUtils.findFileMatches(
        referenceProject,
        JavaFileParser,
        "**/*.java",
        `//annotation[//Identifier[@value='Feature']]`,
    );

    const newFilesToAdd = featureTypes.map(async featureType => {
        const path = (featureType.fileNode as FileNode).path;
        const content = await featureType.file.getContent();
        return project.addFile(path, content);
    });

    return Promise.all(newFilesToAdd).then(_.head);

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
        "copy.features": {
            required: true,
            type: "string",
            displayName: "Comma Separated List Of Features To Copy From Reference Project",
        },
        "reference.branch": {
            required: true,
            type: "string",
            displayName: "Branch to use",
        },
        "reference.name": {
            required: true,
            type: "string",
            displayName: "GitHub repository name",
        },
        "reference.owner": {
            required: true,
            type: "string",
            displayName: "GitHub username",
        },
    },
    transform: [
        RemoveFeatureTransform,
        CopyFeatureTransform,
    ],
};
