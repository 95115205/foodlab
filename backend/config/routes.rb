Rails.application.routes.draw do
  # 식재료 검색 API 엔드포인트
  namespace :api do
    namespace :v1 do
      get "ingredients/search", to: "ingredients#search"
    end
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
