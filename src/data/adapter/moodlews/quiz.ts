import { fetchMoodle } from "./fetch";

export async function getAttemptReview(attemptId: number, page = -1) {
	return fetchMoodle<unknown>("mod_quiz_get_attempt_review", {
		attemptid: attemptId,
		page,
	});
}