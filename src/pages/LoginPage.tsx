export function LoginPage() {
	return (
		<div class="min-h-screen flex items-center justify-center bg-gray-50">
			<div class="text-center max-w-sm px-6 py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
				<div class="text-4xl mb-4"></div>
				<h1 class="text-xl font-semibold text-gray-900 mb-2">
					Login Required
				</h1>
				<p class="text-sm text-gray-500 mb-6">
					You need to be logged in to SCELE to use Sceless.
				</p>
				<a
					href="https://scele.cs.ui.ac.id/login"
					class="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
				>
					Log in to SCELE
				</a>
			</div>
		</div>
	);
}
