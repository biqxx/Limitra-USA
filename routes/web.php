<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\GuidesController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\RedirectController;
use App\Http\Controllers\StaticPageController;
use App\Http\Controllers\StyleLookController;
use App\Http\Controllers\SubcategoryController;
use App\Http\Controllers\VideoViewController;
use Illuminate\Support\Facades\Route;

// Storefront
Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/category/{slug}', [CategoryController::class, 'show'])->name('category.show');
Route::get('/category/{catSlug}/{subSlug}', [SubcategoryController::class, 'show'])->name('subcategory.show');
Route::get('/product/{id}', [ProductController::class, 'show'])->name('product.show');
Route::get('/collection/{type}', [CollectionController::class, 'show'])->name('collection.show');
Route::get('/article/{slug}', [ArticleController::class, 'show'])->name('article.show');
Route::get('/guides', [GuidesController::class, 'index'])->name('guides.index');
Route::get('/looks', [StyleLookController::class, 'index'])->name('looks.index');
Route::get('/look/{slug}', [StyleLookController::class, 'show'])->name('look.show');
Route::get('/page/{page}', [StaticPageController::class, 'show'])->name('page.show');
Route::post('/api/chat', [ChatController::class, 'message'])->name('chat.message')->middleware('throttle:30,1');
Route::post('/newsletter/subscribe', [NewsletterController::class, 'store'])->name('newsletter.subscribe');
Route::get('/go/{id}', [RedirectController::class, 'go'])->name('go')->middleware('throttle:120,1');
Route::post('/videos/{id}/track-view', [VideoViewController::class, 'store'])->name('videos.track-view')->middleware('throttle:60,1');

// Admin auth (public)
Route::get('/admin/login', [AdminAuthController::class, 'showLogin'])->name('admin.login');
Route::post('/admin/login', [AdminAuthController::class, 'login'])->name('admin.login.post')->middleware('throttle:6,1');
Route::post('/admin/logout', [AdminAuthController::class, 'logout'])->name('admin.logout');

// Admin (protected)
Route::middleware('admin')->group(function () {
    Route::get('/admin', [AdminController::class, 'index'])->name('admin');

    Route::post('/admin/products', [AdminController::class, 'storeProduct'])->name('admin.products.store');
    Route::put('/admin/products/{id}', [AdminController::class, 'updateProduct'])->name('admin.products.update');
    Route::delete('/admin/products/{id}', [AdminController::class, 'destroyProduct'])->name('admin.products.destroy');
    Route::post('/admin/products/bulk-import', [AdminController::class, 'bulkImportProducts'])->name('admin.products.bulk');

    Route::put('/admin/categories/{id}', [AdminController::class, 'updateCategory'])->name('admin.categories.update');

    Route::post('/admin/occasions', [AdminController::class, 'storeOccasion'])->name('admin.occasions.store');
    Route::put('/admin/occasions/{id}', [AdminController::class, 'updateOccasion'])->name('admin.occasions.update');
    Route::delete('/admin/occasions/{id}', [AdminController::class, 'destroyOccasion'])->name('admin.occasions.destroy');
    Route::post('/admin/occasions/bulk-import', [AdminController::class, 'bulkImportOccasions'])->name('admin.occasions.bulk');

    Route::post('/admin/articles', [AdminController::class, 'storeArticle'])->name('admin.articles.store');
    Route::put('/admin/articles/{id}', [AdminController::class, 'updateArticle'])->name('admin.articles.update');
    Route::delete('/admin/articles/{id}', [AdminController::class, 'destroyArticle'])->name('admin.articles.destroy');
    Route::post('/admin/articles/bulk-import', [AdminController::class, 'bulkImportArticles'])->name('admin.articles.bulk');

    Route::post('/admin/looks', [AdminController::class, 'storeLook'])->name('admin.looks.store');
    Route::put('/admin/looks/{id}', [AdminController::class, 'updateLook'])->name('admin.looks.update');
    Route::delete('/admin/looks/{id}', [AdminController::class, 'destroyLook'])->name('admin.looks.destroy');
    Route::post('/admin/looks/bulk-import', [AdminController::class, 'bulkImportLooks'])->name('admin.looks.bulk');

    Route::post('/admin/images/upload', [AdminController::class, 'uploadImage'])->name('admin.images.upload');
    Route::post('/admin/videos/upload', [AdminController::class, 'uploadVideo'])->name('admin.videos.upload');
    Route::post('/admin/videos', [AdminController::class, 'storeVideo'])->name('admin.videos.store');
    Route::put('/admin/videos/{id}', [AdminController::class, 'updateVideo'])->name('admin.videos.update');
    Route::delete('/admin/videos/{id}', [AdminController::class, 'destroyVideo'])->name('admin.videos.destroy');
    Route::post('/admin/videos/bulk-import', [AdminController::class, 'bulkImportVideos'])->name('admin.videos.bulk');

    Route::post('/admin/conversions/bulk-import', [AdminController::class, 'bulkImportConversions'])->name('admin.conversions.bulk');

    Route::put('/admin/settings', [AdminController::class, 'updateSettings'])->name('admin.settings.update');
});
